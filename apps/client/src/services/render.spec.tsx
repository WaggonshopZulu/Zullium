import $ from "jquery";
import { describe, expect, it, vi } from "vitest";

import FAttribute from "../entities/fattribute.js";
import type FNote from "../entities/fnote.js";
import noteAttributeCache from "../services/note_attribute_cache.js";
import utils from "../services/utils.js";
import { buildNote } from "../test/easy-froca";
import froca from "./froca.js";
import renderDefault, { render } from "./render.js";

// Adds an extra `~renderNote` relation to an already-built note (buildNote's
// object-literal API can only express one relation per key).
function addRenderNoteRelation(note: FNote, targetNoteId: string) {
    const attributeId = utils.randomString(12);
    const attribute = new FAttribute(froca, {
        noteId: note.noteId,
        attributeId,
        type: "relation",
        name: "renderNote",
        value: targetNoteId,
        position: note.attributes.length,
        isInheritable: false
    });
    froca.attributes[attributeId] = attribute;
    note.attributes.push(attributeId);
    (noteAttributeCache.attributes[note.noteId] ??= []).push(attribute);
}

describe("render", () => {
    it("default export exposes render", () => {
        expect(renderDefault.render).toBe(render);
    });

    it("empties and hides the element when there are no renderNote relations", async () => {
        const note = buildNote({ title: "No relations" });
        const $el = $("<div>").append("<span>old</span>");

        const result = await render(note, $el);

        expect(result).toBe(false);
        expect($el.children().length).toBe(0);
        expect($el.css("display")).toBe("none");
    });

    it("ignores relations whose value is empty (filtered out)", async () => {
        const note = buildNote({ title: "Empty value", "~renderNote": "" });
        const $el = $("<div>");

        const result = await render(note, $el);

        expect(result).toBe(false);
    });

    it("reports an error instead of executing anything, since scripting has been removed", async () => {
        const target = buildNote({ title: "Target" });
        const note = buildNote({ title: "Host", "~renderNote": target.noteId });
        const $el = $("<div>");
        const onError = vi.fn();

        const result = await render(note, $el, onError);

        expect(result).toBe(true);
        expect(onError).toHaveBeenCalledOnce();
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(onError.mock.calls[0][1]).toBe(target.noteId);
    });

    it("still reports once when there are multiple renderNote relations", async () => {
        const target1 = buildNote({ title: "Target A" });
        const target2 = buildNote({ title: "Target B" });
        const note = buildNote({ title: "Multi host", "~renderNote": target1.noteId });
        addRenderNoteRelation(note, target2.noteId);
        const $el = $("<div>");
        const onError = vi.fn();

        const result = await render(note, $el, onError);

        expect(result).toBe(true);
        expect(onError).toHaveBeenCalledOnce();
        expect(onError.mock.calls[0][1]).toBe(target1.noteId);
    });

    it("does not call onError when there is nothing to render", async () => {
        const note = buildNote({ title: "No relations 2" });
        const onError = vi.fn();

        await render(note, $("<div>"), onError);

        expect(onError).not.toHaveBeenCalled();
    });
});
