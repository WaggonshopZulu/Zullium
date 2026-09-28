import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/i18n.js", () => ({ t: (key: string) => key }));
vi.mock("../services/utils.js", () => ({
    isMobile: () => mockState.mobile,
    reloadFrontendApp: vi.fn()
}));

const optionsState = vi.hoisted(() => ({ layoutOrientation: "vertical" }));
vi.mock("../services/options.js", () => ({
    default: {
        get: (name: string) => optionsState[name as keyof typeof optionsState],
        save: vi.fn()
    }
}));

const shown = vi.hoisted(() => ({ items: undefined as unknown, handler: undefined as unknown }));
vi.mock("./context_menu.js", () => ({
    default: {
        show: (opts: { items: unknown; selectMenuItemHandler: unknown }) => {
            shown.items = opts.items;
            shown.handler = opts.selectMenuItemHandler;
        }
    }
}));

const mockState = { mobile: false };

import { showLauncherContextMenu } from "./launcher_button_context_menu.js";

/** Flattens a menu tree (including nested `items`) into the titles it shows, in order. */
function titles(items: unknown[]): string[] {
    return (items as { title?: string; items?: unknown[] }[]).flatMap((item) =>
        [ item.title, ...(item.items ? titles(item.items) : []) ].filter((t): t is string => !!t));
}

function fakeEvent() {
    return { preventDefault: vi.fn(), pageX: 10, pageY: 20 } as unknown as Parameters<typeof showLauncherContextMenu>[1];
}

describe("showLauncherContextMenu", () => {
    beforeEach(() => {
        mockState.mobile = false;
        optionsState.layoutOrientation = "vertical";
    });

    afterEach(() => vi.restoreAllMocks());

    it("never offers a way to configure or remove from the launch bar", async () => {
        await showLauncherContextMenu(null, fakeEvent());

        const all = titles(shown.items as unknown[]);
        expect(all).not.toContain("launcher_button_context_menu.configure_launch_bar");
        expect(all).not.toContain("launcher_button_context_menu.remove_from_launch_bar");
    });

    it("offers the layout orientation submenu on desktop, not on mobile", async () => {
        await showLauncherContextMenu(null, fakeEvent());
        expect(titles(shown.items as unknown[])).toContain("launcher_button_context_menu.launch_bar_orientation");

        mockState.mobile = true;
        await showLauncherContextMenu(null, fakeEvent());
        expect(shown.items).toEqual([]);
    });

    it("appends the caller's own items, and routes their command through onCommand", async () => {
        const onCommand = vi.fn();
        await showLauncherContextMenu(null, fakeEvent(), {
            extraItems: [ { title: "Open in new tab", command: "openInTab" } ],
            onCommand
        });

        expect(titles(shown.items as unknown[])).toContain("Open in new tab");

        (shown.handler as (item: { command?: string }) => void)({ command: "openInTab" });
        expect(onCommand).toHaveBeenCalledWith("openInTab");
    });
});
