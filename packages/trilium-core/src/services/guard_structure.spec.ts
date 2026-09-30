import { dayjs, GUARD_ROOT_NOTE_IDS, REFERENCE_NOTE_ID, SHIFT_LOG_NOTE_ID } from "@triliumnext/commons";
import { describe, expect, it } from "vitest";

import becca from "../becca/becca.js";
import attributeService from "./attributes.js";
import { getContext } from "./context.js";
import dateNotesService from "./date_notes.js";
import { ensureGuardStructure, ensureShiftLogDates } from "./guard_structure.js";
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

        for (const [ noteId, title ] of [ [ SHIFT_LOG_NOTE_ID, "Daily Shift Log" ], [ REFERENCE_NOTE_ID, "Reference" ] ]) {
            const note = becca.notes[noteId];
            expect(note?.title).toBe(title);
            const parents = note.getParentBranches().filter((branch) => !branch.isDeleted);
            expect(parents.map((branch) => branch.parentNoteId)).toEqual([ "root" ]);
        }

        const rootChildren = becca.notes["root"].getChildNotes().map((note) => note.noteId);
        expect(rootChildren.indexOf(SHIFT_LOG_NOTE_ID)).toBeLessThan(rootChildren.indexOf(REFERENCE_NOTE_ID));
        expect(becca.notes[SHIFT_LOG_NOTE_ID].getOwnedLabels("calendarRoot")).toHaveLength(1);
    });

    it("hides the children list on both roots, and only the log's reaches its descendants", () => {
        ensure();

        const [ logLabel ] = becca.notes[SHIFT_LOG_NOTE_ID].getOwnedLabels("hideChildrenOverview");
        const [ referenceLabel ] = becca.notes[REFERENCE_NOTE_ID].getOwnedLabels("hideChildrenOverview");

        expect(logLabel?.isInheritable).toBe(true);
        expect(referenceLabel, "the Reference page carries the label").toBeDefined();
        expect(referenceLabel.isInheritable).toBe(false);
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
            shiftLog.title = "Daily Shift Log";
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
        const monthNote = yearNote?.getChildNotes().find((note) => note.title.includes("September"));

        getContext().init(() => {
            for (const note of [ becca.notes[SHIFT_LOG_NOTE_ID], yearNote, monthNote ]) {
                if (note) {
                    treeService.sortNotesIfNeeded(note.noteId);
                }
            }
        });

        expect(childTitles(yearNote?.noteId ?? "")).toEqual([ "October 2026", "September 2026" ]);
        expect(childTitles(monthNote?.noteId ?? "")).toEqual([
            "Monday, September 28, 2026",
            "Sunday, September 27, 2026",
            "Saturday, September 26, 2026"
        ]);
    });

    it("pre-creates blank day notes through the horizon, and does nothing once it is reached", () => {
        ensure();
        const dateOf = (d: string) => attributeService.getNoteWithLabel("dateNote", d);
        // A near horizon keeps the test cheap; the startup default is the end of next year.
        const horizon = dayjs().add(2, "day");
        const beyond = horizon.add(1, "day");

        getContext().init(() => ensureShiftLogDates(horizon));

        expect(dateOf(dayjs().format("YYYY-MM-DD")), "today's page exists").not.toBeNull();
        expect(dateOf(horizon.format("YYYY-MM-DD")), "the horizon's page exists").not.toBeNull();
        expect(dateOf(beyond.format("YYYY-MM-DD")), "nothing past the horizon").toBeNull();

        const countDayNotes = () => Object.values(becca.notes).filter((note) => note.hasOwnedLabel("dateNote")).length;
        const before = countDayNotes();
        // The horizon's page now exists, so a second pass is a no-op and adds no duplicates.
        getContext().init(() => ensureShiftLogDates(horizon));
        expect(countDayNotes()).toBe(before);
    });
});
