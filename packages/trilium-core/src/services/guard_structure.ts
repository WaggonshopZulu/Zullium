import { dayjs, Dayjs, REFERENCE_NOTE_ID, SHIFT_LOG_NOTE_ID } from "@triliumnext/commons";

import becca from "../becca/becca.js";
import type BNote from "../becca/entities/bnote.js";
import attributeService from "./attributes.js";
import dateNotesService from "./date_notes.js";
import noteService from "./notes.js";

const DATE_LABEL = "dateNote";

interface GuardRootDefinition {
    noteId: string;
    title: string;
    notePosition: number;
    /** Labels the note must carry. `inheritable` ones also apply to every descendant. */
    labels: { name: string; value?: string; inheritable?: boolean }[];
}

const GUARD_ROOTS: GuardRootDefinition[] = [
    {
        noteId: SHIFT_LOG_NOTE_ID,
        title: "Daily Shift Log",
        notePosition: 10,
        // `calendarRoot` makes the day-note service build its year, month and day notes here. Each
        // level sorts its children by their ISO date label (`yearNote` "2026", `monthNote` "2026-09",
        // `dateNote` "2026-09-01") rather than by title, so the human-readable titles ("September
        // 2026", "Tuesday, September 01, 2026") don't disturb chronological order; `sortDirection=desc`
        // is inheritable, putting the newest entry first at every level.
        labels: [
            { name: "iconClass", value: "bx bx-calendar" },
            { name: "calendarRoot" },
            { name: "sorted", value: "yearNote" },
            { name: "sortDirection", value: "desc", inheritable: true },
            { name: "hideChildrenOverview", inheritable: true }
        ]
    },
    {
        noteId: REFERENCE_NOTE_ID,
        title: "Reference",
        notePosition: 20,
        labels: [ { name: "iconClass", value: "bx bx-book" }, { name: "sorted" } ]
    }
];

/**
 * Makes sure the sidebar's two top-level branches exist, Shift Log and Reference, each with the
 * labels that give it its behavior. Creates what is missing and puts back a missing label, and
 * leaves a title or position someone changed alone.
 */
export function ensureGuardStructure() {
    for (const definition of GUARD_ROOTS) {
        const note = becca.notes[definition.noteId] ?? createGuardRoot(definition);
        for (const label of definition.labels) {
            enforceLabel(note, label);
        }
    }
}

/**
 * Keeps a rolling window of blank day notes waiting under the Daily Shift Log, so an officer finds
 * the page for any upcoming date already there — including far enough ahead to write a headline in
 * advance (a birthday, the day's roster). Fills from the start of the current month through the end
 * of next year. It runs at every startup but only creates anything while that horizon has not been
 * reached: the day note for the last day of next year already existing means the window is built, so
 * the steady-state cost is a single lookup. `getDayNote` is idempotent, so the yearly extension only
 * adds the newly-in-range dates. Assumes {@link ensureGuardStructure} has run, since the day notes
 * hang off the Daily Shift Log it creates.
 */
export function ensureShiftLogDates(targetEnd: Dayjs = dayjs().add(1, "year").endOf("year")) {
    if (attributeService.getNoteWithLabel(DATE_LABEL, targetEnd.format("YYYY-MM-DD"))) {
        return;
    }

    for (let date = dayjs().startOf("month"); !date.isAfter(targetEnd, "day"); date = date.add(1, "day")) {
        dateNotesService.getDayNote(date.format("YYYY-MM-DD"));
    }
}

function createGuardRoot(definition: GuardRootDefinition): BNote {
    return noteService.createNewNote({
        noteId: definition.noteId,
        parentNoteId: "root",
        title: definition.title,
        type: "text",
        content: "",
        notePosition: definition.notePosition,
        isProtected: false
    }).note;
}

function enforceLabel(note: BNote, label: GuardRootDefinition["labels"][number]) {
    if (!note.hasOwnedLabel(label.name)) {
        note.addLabel(label.name, label.value ?? "", label.inheritable ?? false);
    }
}
