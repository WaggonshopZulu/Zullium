import { GUARD_ROOT_NOTE_IDS, REFERENCE_NOTE_ID, SHIFT_LOG_NOTE_ID } from "@triliumnext/commons";
import { describe, expect, it } from "vitest";

import becca from "../becca/becca.js";
import { getContext } from "./context.js";
import dateNotesService from "./date_notes.js";
import { ensureGuardStructure } from "./guard_structure.js";
import treeService from "./tree.js";

function ensure() {
    getContext().init(() => ensureGuardStructure());
}

/** The child note titles of a note, in the order the tree holds them. */
function childTitles(noteId: string) {
    return becca.notes[noteId].getChildBranches()
        .filter((branch) => !branch.isDeleted)
        .sort((a, b) => a.notePosition - b.notePosition)
        .map((branch) => branch.getNote().title);
}

describe("guard structure", () => {
    it("creates Shift Log and Reference directly under the root, once", () => {
        ensure();
        ensure();

        for (const [ noteId, title ] of [ [ SHIFT_LOG_NOTE_ID, "Shift Log" ], [ REFERENCE_NOTE_ID, "Reference" ] ]) {
            const note = becca.notes[noteId];
            expect(note?.title).toBe(title);
            const parents = note.getParentBranches().filter((branch) => !branch.isDeleted);
            expect(parents.map((branch) => branch.parentNoteId)).toEqual([ "root" ]);
        }

        const rootChildren = becca.notes["root"].getChildNotes().map((note) => note.noteId);
        expect(rootChildren.indexOf(SHIFT_LOG_NOTE_ID)).toBeLessThan(rootChildren.indexOf(REFERENCE_NOTE_ID));
        expect(becca.notes[SHIFT_LOG_NOTE_ID].getOwnedLabels("calendarRoot")).toHaveLength(1);
    });

    it("puts back a label that was removed, and leaves a changed title alone", () => {
        ensure();
        const shiftLog = becca.notes[SHIFT_LOG_NOTE_ID];

        getContext().init(() => {
            for (const label of shiftLog.getOwnedLabels("sortDirection")) {
                label.markAsDeleted();
            }
            shiftLog.title = "Renamed";
            shiftLog.save();
        });
        expect(shiftLog.hasOwnedLabel("sortDirection")).toBe(false);

        ensure();

        expect(shiftLog.getOwnedLabelValue("sortDirection")).toBe("desc");
        expect(shiftLog.title).toBe("Renamed");

        getContext().init(() => {
            shiftLog.title = "Shift Log";
            shiftLog.save();
        });
    });

    it("refuses to delete either branch", () => {
        ensure();

        for (const noteId of GUARD_ROOT_NOTE_IDS) {
            const branch = becca.notes[noteId].getParentBranches()[0];
            expect(() => getContext().init(() => branch.deleteBranch())).toThrow(/Can't delete/);
            expect(becca.notes[noteId]).toBeDefined();
        }
    });

    it("files day notes under Shift Log, the newest first at every level", () => {
        ensure();

        getContext().init(() => {
            for (const date of [ "2026-09-26", "2026-09-27", "2026-10-01", "2026-09-28" ]) {
                dateNotesService.getDayNote(date);
            }
        });

        const yearNote = becca.notes[SHIFT_LOG_NOTE_ID].getChildNotes().find((note) => note.title === "2026");
        expect(yearNote, "the year note sits under Shift Log").toBeDefined();
        const monthNote = yearNote?.getChildNotes().find((note) => note.title.endsWith("September"));

        getContext().init(() => {
            for (const note of [ becca.notes[SHIFT_LOG_NOTE_ID], yearNote, monthNote ]) {
                if (note) {
                    treeService.sortNotesIfNeeded(note.noteId);
                }
            }
        });

        expect(childTitles(yearNote?.noteId ?? "")).toEqual([ "10 - October", "09 - September" ]);
        expect(childTitles(monthNote?.noteId ?? "")).toEqual([ "28 - Monday", "27 - Sunday", "26 - Saturday" ]);
    });
});
