/**
 * Whether a text note is edited with the classic toolbar, a bar standing above the note, rather
 * than the floating one that follows the selection. Only a view narrow enough to have asked for
 * the floating toolbar gets it (the geo map's marker pane; see `floatingToolbar` in link.ts): a bar
 * built for the width of a note fits none of them.
 */
export function usesClassicToolbar({ floatingToolbarRequested }: { floatingToolbarRequested?: boolean }) {
    return !floatingToolbarRequested;
}

/**
 * The whole of what the editor's toolbar offers, in the order it appears: text style, highlight
 * and font colors, font family and size, inserting an image or a file, and finding text in the note. Nothing
 * else has a button, and each button carries its name in words (see the `TriliumGuardToolbar` plugin).
 */
export const TOOLBAR_ITEMS = [
    "bold",
    "italic",
    "underline",
    "|",
    "fontBackgroundColor",
    "fontColor",
    "|",
    "fontFamily",
    "fontSize",
    "|",
    "imageUpload",
    "attachFile",
    "|",
    "findInNote"
];

/** The same items on the classic bar and on the floating one, so no view offers more than another. */
export function buildToolbarConfig() {
    return {
        toolbar: {
            items: [ ...TOOLBAR_ITEMS ],
            // Nothing is grouped away behind an overflow button: the guard sees every item.
            shouldNotGroupWhenFull: true
        }
    };
}
