import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Covers the Task 8 admin gate on RootCommandExecutor's own commands (see
 * apps/client/src/services/admin_mode.ts): SQL Console, Backend Log, Hidden Subtree, Search
 * History, SQL Console History and Configure Launch Bar all refuse outside admin mode, as the
 * backstop behind their disabled/removed menu entries.
 */
// requireAdminMode calls isAdminMode() internally, a same-module binding that importOriginal's
// spread would not redirect to an override — so both are reimplemented together here, against the
// one shared mockState, rather than only overriding isAdminMode.
const mockState = vi.hoisted(() => ({ admin: false }));
const adminOnlyToast = vi.hoisted(() => vi.fn());
vi.mock("../services/admin_mode.js", () => ({
    isAdminMode: () => mockState.admin,
    requireAdminMode: async (action: () => unknown) => {
        if (!mockState.admin) {
            adminOnlyToast();
            return undefined;
        }
        return await action();
    }
}));

const dateNoteService = vi.hoisted(() => ({
    createSqlConsole: vi.fn(async () => ({ noteId: "sqlConsoleNote" }))
}));
vi.mock("../services/date_notes.js", () => ({ default: dateNoteService }));

const appContextMock = vi.hoisted(() => ({
    tabManager: {
        openTabWithNoteWithHoisting: vi.fn(async () => ({ ntxId: "ntx1" })),
        openContextWithNote: vi.fn(async (..._a: unknown[]) => ({}))
    },
    triggerCommand: vi.fn(),
    triggerEvent: vi.fn()
}));
vi.mock("./app_context.js", () => ({ default: appContextMock }));

import RootCommandExecutor from "./root_command_executor.js";

describe("RootCommandExecutor — admin-gated commands", () => {
    let executor: RootCommandExecutor;

    beforeEach(() => {
        mockState.admin = false;
        vi.clearAllMocks();
        executor = new RootCommandExecutor();
    });

    it("refuses SQL Console outside admin mode, and says why, without opening a note", async () => {
        await executor.showSQLConsoleCommand();

        expect(dateNoteService.createSqlConsole).not.toHaveBeenCalled();
        expect(adminOnlyToast).toHaveBeenCalledOnce();
    });

    it("opens SQL Console in admin mode", async () => {
        mockState.admin = true;

        await executor.showSQLConsoleCommand();

        expect(dateNoteService.createSqlConsole).toHaveBeenCalled();
        expect(appContextMock.tabManager.openTabWithNoteWithHoisting).toHaveBeenCalledWith("sqlConsoleNote", { activate: true });
    });

    it("refuses Backend Log outside admin mode, opens it in admin mode", async () => {
        await executor.showBackendLogCommand();
        expect(appContextMock.tabManager.openTabWithNoteWithHoisting).not.toHaveBeenCalled();

        mockState.admin = true;
        await executor.showBackendLogCommand();
        expect(appContextMock.tabManager.openTabWithNoteWithHoisting).toHaveBeenCalledWith("_backendLog", { activate: true });
    });

    it("refuses Configure Launch Bar outside admin mode, opens it in admin mode", async () => {
        await executor.showLaunchBarSubtreeCommand();
        expect(appContextMock.triggerCommand).not.toHaveBeenCalled();

        mockState.admin = true;
        await executor.showLaunchBarSubtreeCommand();
        expect(appContextMock.triggerCommand).toHaveBeenCalledWith("openInTreePopup", { noteIdOrPath: "_lbRoot", hoistedNoteId: "_lbRoot" });
    });

    it("refuses Hidden Subtree, Search History and SQL Console History outside admin mode", async () => {
        await executor.showHiddenSubtreeCommand();
        await executor.showSearchHistoryCommand();
        await executor.showSQLConsoleHistoryCommand();

        expect(appContextMock.tabManager.openContextWithNote).not.toHaveBeenCalled();
        expect(adminOnlyToast).toHaveBeenCalledTimes(3);
    });

    it("opens Hidden Subtree, Search History and SQL Console History in admin mode", async () => {
        mockState.admin = true;

        await executor.showHiddenSubtreeCommand();
        await executor.showSearchHistoryCommand();
        await executor.showSQLConsoleHistoryCommand();

        const openedIds = appContextMock.tabManager.openContextWithNote.mock.calls.map((call) => call[0]);
        expect(openedIds).toEqual([ "_hidden", "_search", "_sqlConsole" ]);
    });

    it("refuses Shared Notes and Help outside admin mode, and opens them in admin mode", async () => {
        await executor.showShareSubtreeCommand();
        await executor.showHelpCommand();

        expect(appContextMock.tabManager.openContextWithNote).not.toHaveBeenCalled();
        expect(adminOnlyToast).toHaveBeenCalledTimes(2);

        mockState.admin = true;
        await executor.showShareSubtreeCommand();
        await executor.showHelpCommand();

        const openedIds = appContextMock.tabManager.openContextWithNote.mock.calls.map((call) => call[0]);
        expect(openedIds).toEqual([ "_share", "_help" ]);
    });
});
