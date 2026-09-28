import { beforeAll, describe, expect, it, vi } from "vitest";

import becca from "../becca/becca.js";
import type BNote from "../becca/entities/bnote.js";
import { getContext } from "./context.js";
import hiddenSubtreeService, {
    LBTPL_BASE,
    LBTPL_COMMAND,
    LBTPL_CUSTOM_WIDGET,
    LBTPL_NOTE_LAUNCHER,
    LBTPL_ROOT,
    LBTPL_SCRIPT,
    LBTPL_SPACER,
    LBTPL_WIDGET
} from "./hidden_subtree.js";
import noteService from "./notes.js";

/**
 * Re-create a deprecated hidden-subtree note under its declared parent so the
 * enforceDeleted branch in checkHiddenSubtree has something to delete. The one
 * remaining enforceDeleted entry is the withdrawn AI Chat launcher, `_lbLlmChat`,
 * which sits directly under "_lbRoot" in the definition.
 */
function materialiseDeprecatedNote(noteId: string) {
    getContext().init(() =>
        noteService.createNewNote({
            noteId,
            title: `deprecated-${noteId}`,
            type: "launcher",
            parentNoteId: "_lbRoot",
            content: "",
            ignoreForbiddenParents: true
        })
    );
}

/** The settings pages the guard build keeps, both reached only through admin mode. */
const ADMIN_SETTINGS_PAGES = [ "_optionsShortcuts", "_optionsBackup" ];

function checkHiddenSubtree(force = false) {
    return getContext().init(() => hiddenSubtreeService.checkHiddenSubtree(force));
}

describe("hidden_subtree (real DB)", () => {
    beforeAll(() => {
        // Materialise the full hidden subtree in the shared in-memory fixture DB.
        checkHiddenSubtree();
    });

    describe("checkHiddenSubtree structure", () => {
        it("creates the hidden root and its top-level containers under the expected parents", () => {
            const hidden = becca.notes["_hidden"];
            expect(hidden).toBeDefined();
            expect(hidden.type).toBe("doc");
            // The hidden root must be parented directly under the tree root.
            expect(hidden.getParentBranches().some((b) => b.parentNoteId === "root")).toBe(true);

            // A representative set of the declared children must exist and sit
            // directly under _hidden.
            for (const childId of ["_search", "_options", "_help", "_taskStates", "_lbRoot"]) {
                const child = becca.notes[childId];
                expect(child, `${childId} should exist`).toBeDefined();
                expect(
                    child.getParentBranches().some((b) => b.parentNoteId === "_hidden"),
                    `${childId} should be parented under _hidden`
                ).toBe(true);
            }

            // Nested children are placed under their declared parent, not the root.
            const taskStateNone = becca.notes["_taskStateNone"];
            expect(taskStateNone).toBeDefined();
            expect(taskStateNone.getParentBranches().some((b) => b.parentNoteId === "_taskStates")).toBe(true);
        });

        it("derives an iconClass label from the item icon", () => {
            // _sqlConsole declares icon "bx-data"; the recursion turns the icon
            // into an iconClass label prefixed with "bx ".
            const sqlConsole = becca.notes["_sqlConsole"];
            expect(sqlConsole).toBeDefined();
            const iconClass = sqlConsole.getOwnedLabelValue("iconClass");
            expect(iconClass).toBeTruthy();
            expect(iconClass!.startsWith("bx ")).toBe(true);
            expect(iconClass).toContain("bx-data");
        });

        it("applies declared labels and relations, materialising launcher templates", () => {
            // The note launcher template carries a declared launcherType label.
            const noteLauncher = becca.notes[LBTPL_NOTE_LAUNCHER];
            expect(noteLauncher).toBeDefined();
            expect(noteLauncher.getOwnedLabelValue("launcherType")).toBe("note");

            // The command launcher template likewise advertises its launcherType.
            const commandLauncher = becca.notes[LBTPL_COMMAND];
            expect(commandLauncher).toBeDefined();
            expect(commandLauncher.getOwnedLabelValue("launcherType")).toBe("command");

            // Every declared launchbar template note exists under the template root.
            const templateRoot = becca.notes[LBTPL_ROOT];
            expect(templateRoot).toBeDefined();
            for (const tplId of [
                LBTPL_BASE,
                LBTPL_COMMAND,
                LBTPL_NOTE_LAUNCHER,
                LBTPL_SCRIPT,
                LBTPL_WIDGET,
                LBTPL_SPACER,
                LBTPL_CUSTOM_WIDGET
            ]) {
                const tpl = becca.notes[tplId];
                expect(tpl, `${tplId} should exist`).toBeDefined();
                expect(tpl.getParentBranches().some((b) => b.parentNoteId === LBTPL_ROOT)).toBe(true);
            }
        });

        it("does not re-create the settings pages cut from the guard build", () => {
            // The fixture database is seeded with the full upstream set of pages, and the
            // definition no longer lists most of them. Clear the stale ones, then check that
            // a run builds back only what the definition declares.
            getContext().init(() => {
                for (const branch of [ ...becca.notes["_options"].getChildBranches() ]) {
                    if (!ADMIN_SETTINGS_PAGES.includes(branch.noteId)) {
                        becca.notes[branch.noteId]?.deleteNote();
                    }
                }
            });

            checkHiddenSubtree();

            const pages = becca.notes["_options"].getChildBranches()
                .filter((branch) => !branch.isDeleted)
                .map((branch) => branch.noteId)
                .sort();
            expect(pages).toEqual([ ...ADMIN_SETTINGS_PAGES ].sort());
        });
    });

    describe("enforceAttributes", () => {
        it("removes attributes that are not part of the definition on an enforced note", () => {
            const hidden = becca.notes["_hidden"];
            expect(hidden).toBeDefined();

            // Sanity: the declared docName label survives enforcement.
            expect(hidden.getOwnedLabelValue("docName")).toBe("hidden");

            // Inject a stray owned label, then re-run the integrity check.
            getContext().init(() => {
                hidden.addLabel("strayLabelXyz", "should-be-removed");
            });
            expect(hidden.hasOwnedLabel("strayLabelXyz")).toBe(true);

            checkHiddenSubtree();

            // _hidden has enforceAttributes: true, so the undefined label is purged
            // while the declared docName label is preserved.
            expect(hidden.hasOwnedLabel("strayLabelXyz")).toBe(false);
            expect(hidden.getOwnedLabelValue("docName")).toBe("hidden");
        });

        it("does not re-save a value-less enforced attribute on every run", () => {
            // `_template_text_snippet` declares `#textSnippet`/`#template` with no value, so they
            // are stored as "". The enforcement compare used the raw (undefined) definition value,
            // so `"" !== undefined` re-saved them on every run — and save() always emits a sync
            // entity change, which churned `entitiesReloaded` and tore down every open text editor.
            // The compare now normalizes undefined → "" to match what is actually written.
            const snippet = becca.notes["_template_text_snippet"];
            expect(snippet).toBeDefined();
            const textSnippetAttr = snippet.getOwnedAttributes("label", "textSnippet")[0];
            expect(textSnippetAttr).toBeDefined();
            expect(textSnippetAttr.value).toBe("");

            const saveSpy = vi.spyOn(textSnippetAttr, "save");
            checkHiddenSubtree();
            expect(saveSpy).not.toHaveBeenCalled();
            saveSpy.mockRestore();
        });

        it("repairs a modified value on an enforced attribute", () => {
            const hidden = becca.notes["_hidden"];
            const docNameAttr = hidden.getOwnedAttributes("label", "docName")[0];
            expect(docNameAttr).toBeDefined();

            getContext().init(() => {
                docNameAttr.value = "tampered";
                docNameAttr.save();
            });
            expect(hidden.getOwnedLabelValue("docName")).toBe("tampered");

            checkHiddenSubtree();

            expect(hidden.getOwnedLabelValue("docName")).toBe("hidden");
        });
    });

    describe("enforceDeleted", () => {
        it("removes deprecated notes marked enforceDeleted", () => {
            // _lbLlmChat is declared with enforceDeleted: true. Materialise it first so
            // checkHiddenSubtree actually has a note to delete — otherwise the assertion
            // would pass vacuously even if the enforceDeleted branch were removed.
            const deprecatedId = "_lbLlmChat";
            materialiseDeprecatedNote(deprecatedId);
            expect(becca.notes[deprecatedId], `${deprecatedId} should have been created`).toBeDefined();

            checkHiddenSubtree();

            expect(becca.notes[deprecatedId], `${deprecatedId} should have been deleted`).toBeUndefined();
        });

        it("re-deletes a deprecated note if it reappears", () => {
            const deprecatedId = "_lbLlmChat";

            // First reappearance: recreate the note and confirm a check deletes it.
            materialiseDeprecatedNote(deprecatedId);
            expect(becca.notes[deprecatedId]).toBeDefined();

            checkHiddenSubtree();
            expect(becca.notes[deprecatedId]).toBeUndefined();

            // Second reappearance: the deletion path must run again, not just rely
            // on the note already being absent.
            materialiseDeprecatedNote(deprecatedId);
            expect(becca.notes[deprecatedId]).toBeDefined();

            checkHiddenSubtree();
            expect(becca.notes[deprecatedId]).toBeUndefined();
        });
    });

    describe("the order the settings pages are held in", () => {
        /** The admin settings pages under `_options`, read in the order the tree holds them. */
        function pageOrder() {
            return becca.notes["_options"].getChildBranches()
                .filter((branch) => !branch.isDeleted && ADMIN_SETTINGS_PAGES.includes(branch.noteId))
                .sort((a, b) => a.notePosition - b.notePosition)
                .map((branch) => branch.noteId);
        }

        it("puts them back in the declared order after one is moved, not only on a new database", () => {
            const before = pageOrder();
            expect(before).toEqual(ADMIN_SETTINGS_PAGES);
            expect(before.length).toBeGreaterThan(1);

            // A database that already holds them in some other order: send the first page last.
            const moved = becca.notes["_options"].getChildBranches()
                .find((branch) => branch.noteId === "_optionsShortcuts");
            getContext().init(() => {
                if (moved) {
                    moved.notePosition = 999;
                    moved.save();
                }
            });
            expect(pageOrder()[0]).not.toBe("_optionsShortcuts");

            checkHiddenSubtree();

            expect(pageOrder()).toEqual(before);
        });

        it("leaves a group the user arranges alone, the launcher bar declaring no order", () => {
            const launchers = becca.notes["_lbRoot"].getChildBranches().filter((b) => !b.isDeleted);
            const moved = launchers[0];
            const rearranged = moved.notePosition + 5;

            getContext().init(() => {
                moved.notePosition = rearranged;
                moved.save();
            });

            checkHiddenSubtree();

            expect(moved.notePosition).toBe(rearranged);
        });
    });

    describe("type and idempotency", () => {
        it("restores a note type that was changed away from the definition", () => {
            const options = becca.notes["_options"];
            expect(options).toBeDefined();
            // Declared as a book.
            expect(options.type).toBe("book");

            getContext().init(() => {
                options.type = "text";
                options.save();
            });
            expect(becca.notes["_options"].type).toBe("text");

            checkHiddenSubtree();

            expect(becca.notes["_options"].type).toBe("book");
        });

        it("is idempotent: a repeated forced check does not duplicate branches", () => {
            const searchNote = becca.notes["_search"];
            expect(searchNote).toBeDefined();

            const beforeParents = searchNote
                .getParentBranches()
                .filter((b) => !b.isDeleted)
                .map((b) => b.parentNoteId)
                .sort();

            checkHiddenSubtree(true);
            checkHiddenSubtree(true);

            const afterParents = becca.notes["_search"]
                .getParentBranches()
                .filter((b) => !b.isDeleted)
                .map((b) => b.parentNoteId)
                .sort();

            expect(afterParents).toEqual(beforeParents);
            expect(afterParents).toContain("_hidden");
        });
    });

    describe("exported launchbar template constants", () => {
        it("all exported ids follow the hidden-note underscore convention and are unique", () => {
            const ids = [
                LBTPL_ROOT,
                LBTPL_BASE,
                LBTPL_NOTE_LAUNCHER,
                LBTPL_WIDGET,
                LBTPL_COMMAND,
                LBTPL_SCRIPT,
                LBTPL_SPACER,
                LBTPL_CUSTOM_WIDGET
            ];

            for (const id of ids) {
                expect(id.startsWith("_")).toBe(true);
            }
            expect(new Set(ids).size).toBe(ids.length);
        });
    });
});
