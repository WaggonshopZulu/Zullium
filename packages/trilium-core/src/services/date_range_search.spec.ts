import { describe, expect, it } from "vitest";

import becca from "../becca/becca.js";
import { getContext } from "./context.js";
import dateNotesService from "./date_notes.js";
import { ensureGuardStructure } from "./guard_structure.js";
import noteService from "./notes.js";
import SearchContext from "./search/search_context.js";
import searchService from "./search/services/search.js";

/** How the sidebar search narrows a query to a range of entry dates. */
function rangeFilter(from: string, to: string) {
    return `#dateNote >= "${from}" #dateNote <= "${to}"`;
}

function search(query: string) {
    return getContext().init(() =>
        searchService.findResultsWithQuery(query, new SearchContext({ fastSearch: false, ignoreInternalAttributes: true }))
            .map((result) => becca.notes[result.noteId].title)
    );
}

describe("searching a range of entry dates", () => {
    it("keeps only the day notes inside the range, with or without words to look for", () => {
        getContext().init(() => {
            ensureGuardStructure();
            for (const [ date, text ] of [ [ "2026-08-30", "ladder" ], [ "2026-09-02", "ladder" ], [ "2026-09-20", "ladder" ], [ "2026-09-21", "kettle" ], [ "2026-10-03", "ladder" ] ]) {
                const dayNote = dateNotesService.getDayNote(date);
                noteService.createNewNote({ parentNoteId: dayNote.noteId, title: `${text} on ${date}`, type: "text", content: text });
                dayNote.setContent(`<p>${text}</p>`);
            }
        });

        // Words plus a range: the ladder entries of September only.
        expect(search(`ladder ${rangeFilter("2026-09-01", "2026-09-30")}`).sort()).toStrictEqual([ "02 - Wednesday", "20 - Sunday" ]);

        // A range alone lists every entry in it, bounds included.
        expect(search(rangeFilter("2026-09-20", "2026-09-21")).sort()).toStrictEqual([ "20 - Sunday", "21 - Monday" ]);

        // Only one end given.
        expect(search(`#dateNote >= "2026-10-01"`)).toStrictEqual([ "03 - Saturday" ]);
    });
});
