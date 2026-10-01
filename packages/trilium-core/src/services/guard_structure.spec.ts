import { dayjs, GUARD_ROOT_NOTE_IDS, REFERENCE_NOTE_ID, SHIFT_LOG_NOTE_ID } from "@triliumnext/commons";
import { describe, expect, it } from "vitest";

import becca from "../becca/becca.js";
import attributeService from "./attributes.js";
import { getContext } from "./context.js";
import dateNotesService from "./date_notes.js";
import { assertDatedParent, ensureGuardStructure, ensureShiftLogDates } from "./guard_structure.js";
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
            for (const label of shiftLog.getOwnedLabels("calendarRoot")) {
                label.markAsDeleted();
            }
            shiftLog.title = "Renamed";
            shiftLog.save();
        });
        expect(shiftLog.hasOwnedLabel("calendarRoot")).toBe(false);

        ensure();

        expect(shiftLog.hasOwnedLabel("calendarRoot")).toBe(true);
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

    it("files day notes under Shift Log, the oldest first at every level", () => {
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

        expect(childTitles(yearNote?.noteId ?? "")).toEqual([ "September 2026", "October 2026" ]);
        expect(childTitles(monthNote?.noteId ?? "")).toEqual([
            "Sept 26, 2026 (Saturday)",
            "Sept 27, 2026 (Sunday)",
            "Sept 28, 2026 (Monday)"
        ]);
    });

    it("drops the descending order an earlier build left on the log, and sorts it oldest first", () => {
        ensure();
        const shiftLog = becca.notes[SHIFT_LOG_NOTE_ID];
        getContext().init(() => {
            shiftLog.addLabel("sortDirection", "desc", true);
            ensureGuardStructure();
        });

        expect(shiftLog.hasOwnedLabel("sortDirection")).toBe(false);
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

    it("leaves blank day pages empty, clears the old FYI header, and never touches written pages", () => {
        ensure();
        const horizon = dayjs().add(2, "day");
        const isoOf = (offset: number) => dayjs().add(offset, "day").format("YYYY-MM-DD");
        getContext().init(() => ensureShiftLogDates(horizon));

        const today = attributeService.getNoteWithLabel("dateNote", isoOf(0));
        expect(today?.getContent()).toBe("");
        expect(today?.title).toMatch(/^[A-Z][a-z]{2,4} \d{1,2}, \d{4} \([A-Z][a-z]+day\)$/);

        const written = attributeService.getNoteWithLabel("dateNote", isoOf(1));
        const headed = attributeService.getNoteWithLabel("dateNote", isoOf(2));
        getContext().init(() => {
            written?.setContent("<h2>FYI</h2><p>x</p>");
            headed?.setContent("<h1>Old</h1><h2>FYI</h2><p>&nbsp;</p><hr><p>&nbsp;</p>");
            ensureShiftLogDates(horizon);
        });
        expect(written?.getContent()).toBe("<h2>FYI</h2><p>x</p>");
        expect(headed?.getContent()).toBe("");

        getContext().init(() => {
            if (written) {
                written.title = "Wednesday, September 30, 2026";
                written.save();
            }
            ensureShiftLogDates(horizon);
        });
        expect(written?.title, "an old long title is rewritten").toMatch(/\(\w+day\)$/);
    });

    it("shortens month names to Jan Feb Mar Apr May June July Aug Sept Oct Nov Dec", () => {
        ensure();
        const logRoot = becca.notes[SHIFT_LOG_NOTE_ID];
        getContext().init(() => logRoot.setLabel("datePattern", "{shortMonth3} {dateNumber}"));
        getContext().init(() => ensureGuardStructure());
        expect(logRoot.getOwnedLabelValue("datePattern")).toBe("{shortMonthName} {dateNumber}, {year} ({weekDay})");

        const titles = Array.from({ length: 12 }, (_, month) =>
            dateNotesService.getJournalNoteTitle(logRoot, "day", dayjs(new Date(2026, month, 5)), 5)
                .split(",")[0]);
        expect(titles).toEqual([
            "Jan 5", "Feb 5", "Mar 5", "Apr 5", "May 5", "June 5",
            "July 5", "Aug 5", "Sept 5", "Oct 5", "Nov 5", "Dec 5"
        ]);
    });

    it("locks the log, years and months, refuses undated children, and clears stray text", () => {
        ensure();
        const horizon = dayjs().add(1, "day");
        getContext().init(() => {
            becca.notes[SHIFT_LOG_NOTE_ID].setContent("<p>stray</p>");
            ensureShiftLogDates(horizon);
        });

        const day = attributeService.getNoteWithLabel("dateNote", dayjs().format("YYYY-MM-DD"));
        const month = day?.getParentNotes()[0];
        const year = month?.getParentNotes()[0];

        for (const container of [ becca.notes[SHIFT_LOG_NOTE_ID], year, month ]) {
            expect(container?.hasOwnedLabel("readOnly"), container?.title).toBe(true);
            expect(() => assertDatedParent(container?.noteId ?? "")).toThrow();
        }
        expect(day?.hasOwnedLabel("readOnly")).toBe(false);
        expect(() => assertDatedParent(day?.noteId ?? "")).not.toThrow();
        expect(() => assertDatedParent(REFERENCE_NOTE_ID)).not.toThrow();
        expect(becca.notes[SHIFT_LOG_NOTE_ID].getContent()).toBe("");

    });
});
