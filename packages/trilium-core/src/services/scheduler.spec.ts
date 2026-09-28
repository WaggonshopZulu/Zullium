import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import becca from "../becca/becca.js";
import events from "./events.js";
import hiddenSubtreeService from "./hidden_subtree.js";
import options from "./options.js";
import protected_session from "./protected_session.js";
import { startScheduler } from "./scheduler.js";
import sqlInit from "./sql_init.js";
import ws from "./ws.js";

// scheduler.ts is otherwise covered only incidentally (its timers rarely fire
// within a test's lifetime), which makes its coverage flaky. These tests drive
// startScheduler deterministically with fake timers instead.
//
// We spy on the real service singletons rather than vi.mock()-ing their modules:
// scheduler.js is already evaluated by the test setup's initializeCore(), so its
// internal imports are bound to the real modules — mocking them after the fact
// would not be picked up, but spying on the shared singleton objects is.

const SECOND = 1000;
const HOUR = 3600 * SECOND;

/**
 * startScheduler() registers all its timers inside `sqlInit.dbReady.then(...)`.
 * Awaiting the (already-resolved) dbReady promise lets those then-callbacks run
 * first, so the timers exist before we advance the fake clock.
 *
 * Several microtasks rather than one: the hidden-subtree callback reconciles the
 * language before it runs, and each `await` inside it costs another turn.
 */
async function settleDbReady() {
    await sqlInit.dbReady;
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
    }
}

describe("scheduler", () => {
    let checkHiddenSubtree: ReturnType<typeof vi.spyOn>;
    let isDbInitialized: ReturnType<typeof vi.spyOn>;
    let isProtectedSessionAvailable: ReturnType<typeof vi.spyOn>;
    let getLastProtectedSessionOperationDate: ReturnType<typeof vi.spyOn>;
    let resetDataKey: ReturnType<typeof vi.spyOn>;
    let getOptionInt: ReturnType<typeof vi.spyOn>;
    let reloadFrontend: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        becca.reset();
        vi.useFakeTimers();
        vi.spyOn(console, "log").mockImplementation(() => {});

        checkHiddenSubtree = vi.spyOn(hiddenSubtreeService, "checkHiddenSubtree").mockImplementation(() => {});
        isDbInitialized = vi.spyOn(sqlInit, "isDbInitialized").mockReturnValue(false);
        isProtectedSessionAvailable = vi.spyOn(protected_session, "isProtectedSessionAvailable").mockReturnValue(false);
        getLastProtectedSessionOperationDate = vi.spyOn(protected_session, "getLastProtectedSessionOperationDate").mockReturnValue(null);
        resetDataKey = vi.spyOn(protected_session, "resetDataKey").mockImplementation(() => {});
        getOptionInt = vi.spyOn(options, "getOptionInt").mockReturnValue(600);
        reloadFrontend = vi.spyOn(ws, "reloadFrontend").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("checks the hidden subtree as soon as there is a database", async () => {
        isDbInitialized.mockReturnValue(true);

        startScheduler();
        await settleDbReady();

        expect(checkHiddenSubtree).toHaveBeenCalledTimes(1);
    });

    it("still checks the hidden subtree where the database was opened after the scheduler started", async () => {
        // Which is every path through the setup wizard: the instance has nothing to open when this
        // runs, and the database it goes on to open — restored from a backup, or pulled from a sync
        // server — was written by an older version that knows nothing of whatever has been added to
        // the subtree since. Asking whether the database was initialized at the moment the scheduler
        // started answered for the wrong moment, and left those instances unchecked until a restart.
        isDbInitialized.mockReturnValue(false);

        startScheduler();
        await settleDbReady();

        expect(checkHiddenSubtree).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(7 * HOUR);
        expect(checkHiddenSubtree).toHaveBeenCalledTimes(2);
    });

    it("expires the protected session once it has timed out", async () => {
        isProtectedSessionAvailable.mockReturnValue(true);
        // Non-zero (the source guards on the date being truthy) but far in the past.
        getLastProtectedSessionOperationDate.mockReturnValue(1);
        getOptionInt.mockReturnValue(10); // 10s timeout
        const emit = vi.spyOn(events, "emit").mockImplementation(() => {});

        startScheduler();
        await settleDbReady();

        await vi.advanceTimersByTimeAsync(30 * SECOND);
        expect(resetDataKey).toHaveBeenCalled();
        // The event triggers the becca reload that re-encrypts in-memory titles;
        // manual logout emits it too, and the two paths must stay symmetric.
        expect(emit).toHaveBeenCalledWith(events.LEAVE_PROTECTED_SESSION);
        expect(reloadFrontend).toHaveBeenCalledWith(expect.any(String));
    });
});
