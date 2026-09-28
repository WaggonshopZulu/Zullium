import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ admin: false, desktop: true }));
vi.mock("../../services/admin_mode.js", () => ({ isAdminMode: () => mockState.admin }));
vi.mock("../../services/utils.js", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/utils.js")>()),
    isDesktop: () => mockState.desktop
}));

import Component from "../../components/component.js";
import type FNote from "../../entities/fnote.js";
import { buildNote } from "../../test/easy-froca.js";
import { ParentComponent } from "../react/react_utils.js";
import { shouldShowLauncher, useLauncherChildNotes } from "./LauncherContainer.js";

let container: HTMLDivElement;

afterEach(() => {
    act(() => render(null, container));
    container.remove();
});

function mountHook() {
    const host = new Component();
    let childNotes: FNote[] | undefined;

    function Harness() {
        childNotes = useLauncherChildNotes();
        return null;
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => render(<ParentComponent.Provider value={host}><Harness /></ParentComponent.Provider>, container));

    return { host, getChildNotes: () => childNotes };
}

// The hook resolves the root note, re-renders, then resolves the children — each async step
// needs its own act() round so the intermediate state commits and the next effect fires.
async function flush() {
    for (let i = 0; i < 3; i++) {
        await act(async () => { await new Promise((resolve) => setTimeout(resolve)); });
    }
}

describe("useLauncherChildNotes", () => {
    it("swaps to fresh FNote refs on frocaReloaded (protected launcher titles decrypt after unlock)", async () => {
        // Locked protected session: the launcher note's title is the encrypted placeholder.
        buildNote({
            id: "_lbVisibleLaunchers",
            title: "Visible Launchers",
            children: [ { id: "_lbTestLauncher", title: "[protected]", type: "launcher" } ]
        });

        const { host, getChildNotes } = mountHook();
        await flush();

        const staleNote = getChildNotes()?.[0];
        expect(staleNote?.title).toBe("[protected]");

        // Unlocking rebuilds froca from scratch: same noteIds, brand-new FNote instances,
        // now with decrypted titles. The old instances stay orphaned in the hook's state
        // unless frocaReloaded triggers a re-resolve.
        buildNote({
            id: "_lbVisibleLaunchers",
            title: "Visible Launchers",
            children: [ { id: "_lbTestLauncher", title: "My secret launcher", type: "launcher" } ]
        });

        await act(async () => { await host.handleEvent("frocaReloaded", {}); });
        await flush();

        const freshNote = getChildNotes()?.[0];
        expect(freshNote?.title).toBe("My secret launcher");
        expect(freshNote).not.toBe(staleNote);
    });
});

describe("shouldShowLauncher", () => {
    afterEach(() => {
        mockState.admin = false;
        mockState.desktop = true;
    });

    function launcherNote(labels: Record<string, string> = {}) {
        const attrs = Object.fromEntries(Object.entries(labels).map(([ name, value ]) => [ `#${name}`, value ]));
        return buildNote({ id: "_lbTest", title: "Test launcher", type: "launcher", ...attrs });
    }

    it("shows an ordinary launcher regardless of platform or admin mode", () => {
        expect(shouldShowLauncher(launcherNote())).toBe(true);
    });

    it("hides a non-launcher note, warning rather than throwing", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const note = buildNote({ id: "_lbNotALauncher", title: "Not a launcher", type: "text" });

        expect(shouldShowLauncher(note)).toBe(false);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it("hides a desktopOnly launcher off the desktop, shows it on the desktop", () => {
        const note = launcherNote({ desktopOnly: "" });

        mockState.desktop = false;
        expect(shouldShowLauncher(note)).toBe(false);

        mockState.desktop = true;
        expect(shouldShowLauncher(note)).toBe(true);
    });

    it("hides an adminOnly launcher (e.g. _lbSettings) outside admin mode, shows it in admin mode", () => {
        const note = launcherNote({ adminOnly: "" });

        mockState.admin = false;
        expect(shouldShowLauncher(note)).toBe(false);

        mockState.admin = true;
        expect(shouldShowLauncher(note)).toBe(true);
    });
});
