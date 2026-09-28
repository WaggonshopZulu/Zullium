import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/i18n.js", () => ({ t: (key: string) => key }));
vi.mock("../services/utils.js", () => ({
    isMobile: () => mockState.mobile,
    reloadFrontendApp: vi.fn()
}));
vi.mock("../services/admin_mode.js", () => ({ isAdminMode: () => mockState.admin }));
const triggerCommand = vi.hoisted(() => vi.fn());
vi.mock("../components/app_context.js", () => ({ default: { triggerCommand } }));

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

const mockState = { mobile: false, admin: false };

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
        mockState.admin = false;
        optionsState.layoutOrientation = "vertical";
        triggerCommand.mockClear();
    });

    afterEach(() => vi.restoreAllMocks());

    it("never offers a way to remove from the launch bar, admin mode included", async () => {
        await showLauncherContextMenu(null, fakeEvent());
        mockState.admin = true;
        await showLauncherContextMenu(null, fakeEvent());

        expect(titles(shown.items as unknown[])).not.toContain("launcher_button_context_menu.remove_from_launch_bar");
    });

    it("offers Configure Launch Bar only in admin mode, and it triggers showLaunchBarSubtree", async () => {
        await showLauncherContextMenu(null, fakeEvent());
        expect(titles(shown.items as unknown[])).not.toContain("launcher_button_context_menu.configure_launch_bar");

        mockState.admin = true;
        await showLauncherContextMenu(null, fakeEvent());
        const items = shown.items as { title?: string; handler?: () => void }[];
        const configureItem = items.find((item) => item.title === "launcher_button_context_menu.configure_launch_bar");
        expect(configureItem).toBeDefined();

        configureItem?.handler?.();
        expect(triggerCommand).toHaveBeenCalledWith("showLaunchBarSubtree");
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
