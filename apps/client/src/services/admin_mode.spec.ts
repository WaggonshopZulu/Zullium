import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./i18n.js", () => ({ t: (key: string) => key }));
const showError = vi.hoisted(() => vi.fn());
vi.mock("./toast.js", () => ({ default: { showError } }));

/**
 * `isAdminMode()` reads `window.location.search` once, at module load, so each scenario needs a
 * fresh import after setting the URL — matching how `ActionButton.mobile.spec.tsx` isolates a
 * module-load-time read.
 */
async function loadWithSearch(search: string) {
    vi.resetModules();
    window.history.replaceState(null, "", `/${search}`);
    return await import("./admin_mode.js");
}

describe("isAdminMode", () => {
    afterEach(() => vi.restoreAllMocks());

    it("is true only when the URL carries admin=1", async () => {
        expect((await loadWithSearch("?admin=1")).isAdminMode()).toBe(true);
        expect((await loadWithSearch("?extraWindow=1&admin=1")).isAdminMode()).toBe(true);
        expect((await loadWithSearch("")).isAdminMode()).toBe(false);
        expect((await loadWithSearch("?extraWindow=1")).isAdminMode()).toBe(false);
        // Not a loose substring match: an unrelated key merely containing "admin" must not pass.
        expect((await loadWithSearch("?notadmin=1")).isAdminMode()).toBe(false);
    });
});

describe("requireAdminMode", () => {
    beforeEach(() => showError.mockClear());
    afterEach(() => vi.restoreAllMocks());

    it("runs and returns the action's result in admin mode", async () => {
        const { requireAdminMode } = await loadWithSearch("?admin=1");
        const action = vi.fn(async () => "opened");

        const result = await requireAdminMode(action);

        expect(action).toHaveBeenCalledOnce();
        expect(result).toBe("opened");
        expect(showError).not.toHaveBeenCalled();
    });

    it("never runs the action outside admin mode, and says why", async () => {
        const { requireAdminMode } = await loadWithSearch("");
        const action = vi.fn(async () => "opened");

        const result = await requireAdminMode(action);

        expect(action).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
        expect(showError).toHaveBeenCalledWith("admin_mode.admin_only");
    });
});
