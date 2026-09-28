import { Bold, ButtonView, ClassicEditor, Essentials, FontBackgroundColor, FontColor, Paragraph } from "ckeditor5";
import Uploadfileplugin from "./file_upload/uploadfileplugin.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEditor } from "../../test/editor-kit.js";
import { installGlobMock } from "../../test/globals-test-kit.js";
import GuardToolbar from "./guard_toolbar.js";

describe("GuardToolbar", () => {
    let editor: ClassicEditor;
    let triggerCommand: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        triggerCommand = vi.fn();
        installGlobMock({
            getComponentByEl: () => ({ triggerCommand })
        });

        editor = await createTestEditor(
            [ Essentials, Paragraph, Bold, FontColor, FontBackgroundColor, Uploadfileplugin, GuardToolbar ],
            { toolbar: { items: [ "bold", "|", "fontBackgroundColor", "fontColor", "|", "findInNote", "attachFile" ] } }
        );
    });

    /** Each button of the built toolbar with the words it shows, dropdowns included. */
    function buttons() {
        return [ ...editor.ui.view.toolbar.items ]
            .map((item) => item instanceof ButtonView ? item : (item as { buttonView?: ButtonView }).buttonView)
            .filter((button): button is ButtonView => !!button);
    }

    it("shows text beside every button of the toolbar", () => {
        expect(buttons()).toHaveLength(5);
        expect(buttons().every((button) => button.withText)).toBe(true);
    });

    it("words the two color dropdowns plainly and leaves the other labels alone", () => {
        expect(buttons().map((button) => button.label)).toStrictEqual([ "Bold", "Highlight", "Font color", "Find in note", "Attach file" ]);
    });

    it("opens the find bar on the host component when Find in note is pressed", () => {
        const find = buttons().find((button) => button.label === "Find in note");
        find?.fire("execute");

        expect(triggerCommand).toHaveBeenCalledWith("findInText");
    });

    it("hands the files chosen in the dialog to the upload command", () => {
        const execute = vi.spyOn(editor, "execute").mockImplementation(() => undefined);
        const attach = buttons().find((button) => button.label === "Attach file");
        const files = [ new File([ "x" ], "photo.jpg"), new File([ "y" ], "form.pdf") ];

        (attach as unknown as { fire(name: string, files: File[]): void }).fire("done", files);
        expect(execute).toHaveBeenCalledWith("fileUpload", { file: files });

        execute.mockClear();
        (attach as unknown as { fire(name: string, files: File[]): void }).fire("done", []);
        expect(execute).not.toHaveBeenCalled();
    });
});
