import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import becca from "../becca/becca.js";
import BAttribute from "../becca/entities/battribute.js";
import { buildNote } from "../test/becca_easy_mocking.js";
import eventService from "./events.js";
import hiddenSubtreeService from "./hidden_subtree.js";
import noteService from "./notes.js";
import oneTimeTimer from "./one_time_timer.js";
import treeService from "./tree.js";
import { randomString } from "./utils/index.js";

// handlers.ts only subscribes to events at import time, so it is otherwise
// covered incidentally (whenever some unrelated test happens to fire one of
// these events), which makes its coverage flaky. These tests drive the handlers
// deterministically by emitting the events and spying on the downstream
// singletons (which handlers.ts holds direct references to).

function addAttribute(noteId: string, type: "label" | "relation", name: string, value: string) {
    return new BAttribute({ noteId, attributeId: randomString(12), type, name, value, position: 0, isInheritable: false });
}

describe("handlers", () => {
    let sortNotesIfNeeded: ReturnType<typeof vi.spyOn>;
    let duplicateSubtree: ReturnType<typeof vi.spyOn>;
    let scheduleExecution: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        becca.reset();
        buildNote({ id: "root", title: "root" });

        sortNotesIfNeeded = vi.spyOn(treeService, "sortNotesIfNeeded").mockImplementation(() => {});
        duplicateSubtree = vi.spyOn(noteService, "duplicateSubtreeWithoutRoot").mockImplementation(() => {});
        scheduleExecution = vi.spyOn(oneTimeTimer, "scheduleExecution").mockImplementation(() => {});
        vi.spyOn(hiddenSubtreeService, "checkHiddenSubtree").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("NOTE_TITLE_CHANGED", () => {
        it("re-sorts a sorted parent", () => {
            buildNote({ id: "par2", children: [{ id: "chld2" }] });
            addAttribute("par2", "label", "sorted", "");
            const child = becca.notes["chld2"];
            expect(child).toBeDefined();

            eventService.emit(eventService.NOTE_TITLE_CHANGED, child);
            expect(sortNotesIfNeeded).toHaveBeenCalledWith("par2");
        });
    });

    describe("ENTITY_CHANGED (attributes)", () => {
        it("re-sorts the owning note when a 'sorted' label changes", () => {
            buildNote({ id: "p" });
            const attr = addAttribute("p", "label", "sorted", "");

            eventService.emit(eventService.ENTITY_CHANGED, { entityName: "attributes", entity: attr });
            expect(sortNotesIfNeeded).toHaveBeenCalledWith("p");
        });

        it("re-sorts the parent only when the changed label is one of the #sorted levels", () => {
            buildNote({ id: "ml-par", children: [{ id: "ml-chld" }] });
            addAttribute("ml-par", "label", "sorted", "priority desc, dueDate");

            const unrelated = addAttribute("ml-chld", "label", "priorityNote", "x");
            eventService.emit(eventService.ENTITY_CHANGED, {
                entityName: "attributes", entity: unrelated
            });
            expect(sortNotesIfNeeded).not.toHaveBeenCalledWith("ml-par");

            const dueDate = addAttribute("ml-chld", "label", "dueDate", "2026-01-01");
            eventService.emit(eventService.ENTITY_CHANGED, {
                entityName: "attributes", entity: dueDate
            });
            expect(sortNotesIfNeeded).toHaveBeenCalledWith("ml-par");
        });

        it("re-sorts the parent when a sort-affecting label (e.g. 'top') changes", () => {
            buildNote({ id: "par", children: [{ id: "chld" }] });
            addAttribute("par", "label", "sorted", "title");
            const topAttr = addAttribute("chld", "label", "top", "");

            eventService.emit(eventService.ENTITY_CHANGED, { entityName: "attributes", entity: topAttr });
            expect(sortNotesIfNeeded).toHaveBeenCalledWith("par");
        });
    });

    describe("ENTITY_CREATED (template relation)", () => {
        it("copies template content and subtree into an empty note", () => {
            buildNote({ id: "tmpl", type: "text", mime: "text/html", content: "TEMPLATE BODY" });
            const note = buildNote({ id: "n", type: "text", mime: "text/html", content: "" });
            const setContent = vi.spyOn(note, "setContent").mockImplementation(() => {});
            vi.spyOn(note, "save").mockReturnValue(note);
            const rel = addAttribute("n", "relation", "template", "tmpl");

            eventService.emit(eventService.ENTITY_CREATED, { entityName: "attributes", entity: rel });

            expect(setContent).toHaveBeenCalledWith("TEMPLATE BODY");
            expect(duplicateSubtree).toHaveBeenCalledWith("tmpl", "n");
        });
    });

    describe("ENTITY_DELETED", () => {
        it("reschedules a hidden-subtree check when a system ('_') note is deleted", () => {
            const sysNote = buildNote({ id: "_systemDeleted", title: "sys" });

            eventService.emit(eventService.ENTITY_DELETED, { entityName: "notes", entity: sysNote });
            expect(scheduleExecution).toHaveBeenCalledWith("hidden-subtree-check", expect.any(Number), expect.any(Function));
        });
    });
});
