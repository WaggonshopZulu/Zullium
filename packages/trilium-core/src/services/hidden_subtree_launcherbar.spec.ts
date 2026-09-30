import type { HiddenSubtreeItem } from "@triliumnext/commons";
import { describe, expect, it } from "vitest";

import buildLaunchBarConfig from "./hidden_subtree_launcherbar.js";

function byId(items: HiddenSubtreeItem[], id: string): HiddenSubtreeItem {
    const item = items.find((i) => i.id === id);
    expect(item, `expected launcher ${id} to exist`).toBeDefined();
    return item!;
}

function labelValue(item: HiddenSubtreeItem, name: string): string | undefined {
    return item.attributes?.find((a) => a.type === "label" && a.name === name)?.value;
}

describe("buildLaunchBarConfig", () => {
    it("returns the four launcher groups, each non-empty and typed as launchers", () => {
        const config = buildLaunchBarConfig();

        const groups = [
            config.desktopAvailableLaunchers,
            config.desktopVisibleLaunchers,
            config.mobileAvailableLaunchers,
            config.mobileVisibleLaunchers
        ];

        for (const group of groups) {
            expect(Array.isArray(group)).toBe(true);
            expect(group.length).toBeGreaterThan(0);
            for (const launcher of group) {
                expect(launcher.type, launcher.id).toBe("launcher");
                expect(launcher.id, "every launcher has an id").toBeTruthy();
                expect(launcher.id.startsWith("_"), `${launcher.id} is a hidden-subtree id`).toBe(true);
                // Every launcher carries a title produced by the translation function.
                expect(typeof launcher.title, launcher.id).toBe("string");
            }
        }
    });

    it("assigns unique ids within each group", () => {
        const config = buildLaunchBarConfig();

        for (const group of [
            config.desktopAvailableLaunchers,
            config.desktopVisibleLaunchers,
            config.mobileAvailableLaunchers,
            config.mobileVisibleLaunchers
        ]) {
            const ids = group.map((l) => l.id);
            expect(new Set(ids).size, ids.join(",")).toBe(ids.length);
        }
    });

    it("exposes the expected desktop visible launcher ids in order", () => {
        const { desktopVisibleLaunchers } = buildLaunchBarConfig();

        expect(desktopVisibleLaunchers.map((l) => l.id)).toEqual([
            "_lbNewNote",
            "_lbSearch",
            "_lbJumpTo",
            "_lbNoteMap",
            "_lbLlmChat",
            "_lbCalendar",
            "_lbRecentChanges",
            "_lbSpacer1",
            "_lbBookmarks",
            "_lbToday",
            "_lbSpacer2",
            "_lbQuickSearch",
            "_lbProtectedSession",
            "_lbSyncStatus",
            "_lbSettings"
        ]);
    });

    it("exposes the expected mobile launcher ids", () => {
        const { mobileAvailableLaunchers, mobileVisibleLaunchers } = buildLaunchBarConfig();

        expect(mobileAvailableLaunchers.map((l) => l.id)).toEqual([
            "_lbMobileNewNote",
            "_lbMobileSearchNotes",
            "_lbMobileToday",
            "_lbMobileRecentChanges",
            "_lbMobileBookmarks",
            "_lbMobileSyncStatus"
        ]);
        expect(mobileVisibleLaunchers.map((l) => l.id)).toEqual([
            "_lbMobileBackInHistory",
            "_lbMobileForwardInHistory",
            "_lbMobileJumpTo",
            "_lbMobileCalendar",
            "_lbMobileTabSwitcher"
        ]);
    });

    it("wires command-driven launchers to their commands", () => {
        const config = buildLaunchBarConfig();

        expect(byId(config.desktopVisibleLaunchers, "_lbNewNote").command).toBe("createNoteIntoInbox");
        expect(byId(config.desktopAvailableLaunchers, "_lbDeletedNotes").command).toBe("showDeletedNotes");
        expect(byId(config.desktopVisibleLaunchers, "_lbSettings").command).toBe("showOptions");
        expect(byId(config.desktopAvailableLaunchers, "_commandPalette").command).toBe("commandPalette");
    });

    it("marks the launchers for features this build removed as enforceDeleted", () => {
        const config = buildLaunchBarConfig();

        // Zen mode went with the rest of the window chrome (Task 6); sidebar chat went with the
        // AI Chat feature (Task 13); protected session went with removing password protection
        // from the UI entirely. None of these launchers resolves to anything any more.
        expect(byId(config.desktopAvailableLaunchers, "_zenMode").enforceDeleted).toBe(true);
        expect(byId(config.desktopAvailableLaunchers, "_lbSidebarChat").enforceDeleted).toBe(true);
        expect(byId(config.desktopVisibleLaunchers, "_lbProtectedSession").enforceDeleted).toBe(true);
    });

    it("drops the rail entries the shift-log layout does not use", () => {
        const { desktopVisibleLaunchers } = buildLaunchBarConfig();

        for (const id of [ "_lbSearch", "_lbJumpTo", "_lbNoteMap", "_lbRecentChanges", "_lbQuickSearch" ]) {
            expect(byId(desktopVisibleLaunchers, id).enforceDeleted, id).toBe(true);
        }
        // What the rail keeps: New, Today and Calendar.
        for (const id of [ "_lbNewNote", "_lbToday", "_lbCalendar" ]) {
            expect(byId(desktopVisibleLaunchers, id).enforceDeleted, id).toBeUndefined();
        }
    });

    it("wires builtin-widget launchers to their widgets", () => {
        const config = buildLaunchBarConfig();

        expect(byId(config.desktopVisibleLaunchers, "_lbCalendar").builtinWidget).toBe("calendar");
        expect(byId(config.desktopVisibleLaunchers, "_lbBookmarks").builtinWidget).toBe("bookmarks");
        expect(byId(config.desktopVisibleLaunchers, "_lbToday").builtinWidget).toBe("todayInJournal");
        expect(byId(config.desktopVisibleLaunchers, "_lbSyncStatus").builtinWidget).toBe("syncStatus");
        expect(byId(config.desktopAvailableLaunchers, "_lbBackInHistory").builtinWidget).toBe("backInHistoryButton");
        expect(byId(config.desktopAvailableLaunchers, "_lbForwardInHistory").builtinWidget).toBe("forwardInHistoryButton");
    });

    it("points target-note launchers at the right hidden notes", () => {
        const config = buildLaunchBarConfig();

        expect(byId(config.desktopAvailableLaunchers, "_lbBackendLog").targetNoteId).toBe("_backendLog");
    });

    it("configures both spacers with distinct sizing", () => {
        const { desktopVisibleLaunchers } = buildLaunchBarConfig();

        const spacer1 = byId(desktopVisibleLaunchers, "_lbSpacer1");
        const spacer2 = byId(desktopVisibleLaunchers, "_lbSpacer2");

        expect(spacer1.builtinWidget).toBe("spacer");
        expect(spacer2.builtinWidget).toBe("spacer");
        expect(spacer1.baseSize).toBe("50");
        expect(spacer1.growthFactor).toBe("0");
        expect(spacer2.baseSize).toBe("0");
        expect(spacer2.growthFactor).toBe("1");
    });

    it("flags the deprecated LLM chat launcher as enforceDeleted with no widget", () => {
        const llmChat = byId(buildLaunchBarConfig().desktopVisibleLaunchers, "_lbLlmChat");

        expect(llmChat.enforceDeleted).toBe(true);
        expect(llmChat.command).toBeUndefined();
        expect(llmChat.builtinWidget).toBeUndefined();
        expect(llmChat.targetNoteId).toBeUndefined();
    });

    it("carries the docName / desktopOnly labels on the launchers that need them", () => {
        const config = buildLaunchBarConfig();

        expect(labelValue(byId(config.desktopAvailableLaunchers, "_lbBackInHistory"), "docName"))
            .toBe("launchbar_history_navigation");
        expect(labelValue(byId(config.desktopAvailableLaunchers, "_lbForwardInHistory"), "docName"))
            .toBe("launchbar_history_navigation");
    });

    it("marks _lbSettings adminOnly, so a guard's window never shows it (Task 8)", () => {
        const config = buildLaunchBarConfig();

        const settings = byId(config.desktopVisibleLaunchers, "_lbSettings");
        expect(settings.attributes?.some((a) => a.type === "label" && a.name === "adminOnly")).toBe(true);
    });

    it("reuses the shared launcher definitions across desktop and mobile entries", () => {
        const config = buildLaunchBarConfig();

        const desktopNewNote = byId(config.desktopVisibleLaunchers, "_lbNewNote");
        const mobileNewNote = byId(config.mobileAvailableLaunchers, "_lbMobileNewNote");
        // Same shared definition (command + widget + icon), only the id differs.
        expect(mobileNewNote.command).toBe(desktopNewNote.command);
        expect(mobileNewNote.builtinWidget).toBe(desktopNewNote.builtinWidget);
        expect(mobileNewNote.icon).toBe(desktopNewNote.icon);

        const desktopSync = byId(config.desktopVisibleLaunchers, "_lbSyncStatus");
        const mobileSync = byId(config.mobileAvailableLaunchers, "_lbMobileSyncStatus");
        expect(mobileSync.builtinWidget).toBe(desktopSync.builtinWidget);
    });

    it("returns a fresh independent structure on each invocation", () => {
        const first = buildLaunchBarConfig();
        const second = buildLaunchBarConfig();

        expect(first).not.toBe(second);
        expect(first.desktopVisibleLaunchers).not.toBe(second.desktopVisibleLaunchers);
        expect(first.desktopVisibleLaunchers.map((l) => l.id))
            .toEqual(second.desktopVisibleLaunchers.map((l) => l.id));
    });
});
