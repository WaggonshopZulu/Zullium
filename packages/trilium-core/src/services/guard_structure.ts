import { REFERENCE_NOTE_ID, SHIFT_LOG_NOTE_ID } from "@triliumnext/commons";

import becca from "../becca/becca.js";
import type BNote from "../becca/entities/bnote.js";
import noteService from "./notes.js";

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
        title: "Shift Log",
        notePosition: 10,
        // `calendarRoot` makes the day-note service build its year, month and day notes here. Their
        // titles start with the number (`2026`, `09 - September`, `27 - Sunday`), so ordering them
        // by title and reversing it puts the newest entry first at every level.
        labels: [
            { name: "iconClass", value: "bx bx-calendar" },
            { name: "calendarRoot" },
            { name: "sorted" },
            { name: "sortDirection", value: "desc", inheritable: true }
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
