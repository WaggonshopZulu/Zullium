import { IconFindReplace, IconPaperClip } from "@ckeditor/ckeditor5-icons";
import { ButtonView, FileDialogButtonView, Plugin, type ToolbarView } from "ckeditor5";

/**
 * The words shown beside a toolbar button, where CKEditor's own label is too long or too technical
 * for a reader. Keyed by the label CKEditor gives the button; any other button keeps its own.
 */
const LABELS: Record<string, string> = {
    "Font Background Color": "Highlight",
    "Font Background Colour": "Highlight",
    "Font Color": "Font color",
    "Font Colour": "Font color",
    "Bulleted List": "Bullets",
    "Numbered List": "Numbering",
    "Insert table": "Table"
};

/**
 * Three things for the shift-log toolbar: a "Find in note" button, an "Attach file" button, and a text
 * label beside every button, so no control is a picture alone.
 */
export default class GuardToolbar extends Plugin {
    static get pluginName() {
        return "TriliumGuardToolbar" as const;
    }

    init() {
        this.editor.ui.componentFactory.add("findInNote", (locale) => {
            const view = new ButtonView(locale);

            view.set({
                label: "Find in note",
                icon: IconFindReplace,
                withText: true,
                tooltip: true
            });

            view.on("execute", () => {
                const editorEl = this.editor.editing.view.getDomRoot();
                glob.getComponentByEl(editorEl).triggerCommand("findInText");
            });

            return view;
        });

        // Any file, through the same upload the editor uses for a file dropped or pasted. Pictures
        // have their own button, which puts the picture in the note rather than a link to it.
        this.editor.ui.componentFactory.add("attachFile", (locale) => {
            const view = new FileDialogButtonView(locale);

            view.set({
                acceptedType: "*/*",
                allowMultipleFiles: true,
                label: "Attach file",
                icon: IconPaperClip,
                withText: true,
                tooltip: true
            });

            view.on("done", (_event, files: Iterable<File>) => {
                const chosen = Array.from(files);
                if (chosen.length) {
                    this.editor.execute("fileUpload", { file: chosen });
                }
            });

            return view;
        });

        this.editor.on("ready", () => {
            const toolbar = this.editor.ui.view.toolbar as ToolbarView | undefined;
            if (toolbar) {
                addTextLabels(toolbar);
            }
        });
    }
}

/** Turns on the text beside each button of `toolbar`, and swaps in the plainer wording where there is one. */
export function addTextLabels(toolbar: ToolbarView) {
    for (const item of toolbar.items) {
        // A dropdown holds its button in `buttonView`; a separator has neither.
        const button = item instanceof ButtonView ? item : (item as { buttonView?: ButtonView }).buttonView;
        if (!button) {
            continue;
        }

        const label = LABELS[button.label ?? ""];
        if (label) {
            button.label = label;
        }
        button.withText = true;
    }
}
