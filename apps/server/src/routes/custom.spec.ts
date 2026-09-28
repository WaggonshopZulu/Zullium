import { cls, note_service as noteService } from "@triliumnext/core";
import type { Application } from "express";
import supertest from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

let app: Application;

describe("Custom request/resource handlers", () => {
    beforeAll(async () => {
        app = await (await import("../app.js")).default();

        cls.init(() => {
            // A resource note served directly.
            const resource = noteService.createNewNote({
                parentNoteId: "root",
                title: "Custom resource",
                type: "text",
                content: "<p>resource body</p>"
            }).note;
            resource.setLabel("customResourceProvider", "resource");

            // Empty value → skipped; invalid regex → caught and skipped. Both are
            // exercised by the "no handler matches" request below.
            noteService.createNewNote({ parentNoteId: "root", title: "Empty handler", type: "text", content: "x" })
                .note.setLabel("customResourceProvider", "   ");
            noteService.createNewNote({ parentNoteId: "root", title: "Bad regex handler", type: "text", content: "x" })
                .note.setLabel("customResourceProvider", "([unclosed");
        });
    });

    it("serves a custom resource provider note", async () => {
        const res = await supertest(app).get("/custom/resource").expect(200);
        expect(res.text).toContain("resource body");
    });

    it("returns 404 when no handler matches", async () => {
        const res = await supertest(app).get("/custom/no-such-path").expect(404);
        expect(res.text).toContain("No handler matched");
    });
});
