import type FNote from "../entities/fnote.js";

/**
 * @param noteId the render note the error is attributed to, so the caller can link back to it.
 */
type ErrorHandler = (e: unknown, noteId?: string) => void;

/**
 * "Render" notes built their content by executing a linked script note's bundle. Backend/frontend
 * scripting has been removed from this build, so a render note can no longer produce content — this
 * reports a clear error instead of attempting to call the (now-removed) script execution endpoints.
 */
export async function render(note: FNote, $el: JQuery<HTMLElement>, onError?: ErrorHandler) {
    const relations = note.getRelations("renderNote");
    const renderNoteIds = relations.map((rel) => rel.value).filter((noteId) => noteId);

    $el.empty().toggle(renderNoteIds.length > 0);

    if (renderNoteIds.length > 0) {
        onError?.(new Error("Render notes require backend/frontend scripting, which has been removed."), renderNoteIds[0]);
    }

    return renderNoteIds.length > 0;
}

export default {
    render
};
