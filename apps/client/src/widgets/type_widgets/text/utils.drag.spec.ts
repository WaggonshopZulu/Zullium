import { afterEach, describe, expect, it } from "vitest";

import { installCopyBetweenEditors, isCrossEditorDrag } from "./utils";

describe("copy between editors", () => {
    let release: (() => void) | undefined;

    afterEach(() => {
        release?.();
        document.body.innerHTML = "";
    });

    function drag(from: Element, to: Element) {
        document.body.append(from, to);
        // Stands in for the editor, which accepts the drop and asks for a move.
        to.addEventListener("dragover", (e) => e.preventDefault());
        from.dispatchEvent(new Event("dragstart", { bubbles: true }));
        const over = new Event("dragover", { bubbles: true, cancelable: true });
        const dataTransfer = { dropEffect: "move" };
        Object.defineProperty(over, "dataTransfer", { value: dataTransfer });
        to.dispatchEvent(over);
        from.dispatchEvent(new Event("dragend", { bubbles: true }));
        return dataTransfer.dropEffect;
    }

    const editable = () => Object.assign(document.createElement("div"), { className: "ck-editor__editable" });

    it("turns a drag into another editor into a copy, and leaves a drag inside one editor a move", () => {
        release = installCopyBetweenEditors();

        expect(drag(editable(), editable())).toBe("copy");

        const same = editable();
        expect(drag(same, same)).toBe("move");
    });

    it("compares the editors a drag started and ended in", () => {
        const a = editable();

        expect(isCrossEditorDrag(a, editable())).toBe(true);
        expect(isCrossEditorDrag(a, a)).toBe(false);
        expect(isCrossEditorDrag(null, a)).toBe(false);
    });
});
