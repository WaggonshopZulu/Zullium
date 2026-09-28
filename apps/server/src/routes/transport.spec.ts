import { sql_init } from "@triliumnext/core";
import type { Application } from "express";
import supertest from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { type ApiTestContext, bootLoggedInApp, createTextNote } from "../../spec/support/internal_api.js";

let ctx: ApiTestContext;
let app: Application;

describe("Route transport & middleware", () => {
    beforeAll(async () => {
        ctx = await bootLoggedInApp();
        app = ctx.app;
    });

    describe("bootstrap view detection", () => {
        it("returns the print view when ?print is present", async () => {
            const res = await supertest(app).get("/bootstrap?print").expect(200);
            expect(res.body.device).toBe("print");
        });

        it("returns the mobile view via query, cookie and user-agent", async () => {
            expect((await supertest(app).get("/bootstrap?mobile").expect(200)).body.device).toBe("mobile");
            expect((await supertest(app).get("/bootstrap?desktop").expect(200)).body.device).toBe("desktop");

            const byCookie = await supertest(app).get("/bootstrap").set("Cookie", "trilium-device=mobile").expect(200);
            expect(byCookie.body.device).toBe("mobile");

            const byUa = await supertest(app).get("/bootstrap")
                .set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)").expect(200);
            expect(byUa.body.device).toBe("mobile");
        });

        it("treats ?extraWindow as a non-main window", async () => {
            const res = await supertest(app).get("/bootstrap?extraWindow=1").expect(200);
            expect(res.body.isMainWindow).toBe(false);
        });

        it("includes the server's platform and CPU architecture in the payload", async () => {
            // The client picks the Antigravity ACP server download for the machine running Trilium.
            const res = await supertest(app).get("/bootstrap").expect(200);
            expect(res.body.platform).toBe(process.platform);
            expect(res.body.arch).toBe(process.arch);
        });

        it("includes platform in the setup (uninitialized DB) payload", async () => {
            // The setup window relies on `glob.platform` to apply the
            // platform-darwin drag-region CSS on macOS.
            const spy = vi.spyOn(sql_init, "isDbInitialized").mockReturnValue(false);
            try {
                const res = await supertest(app).get("/bootstrap").expect(200);
                expect(res.body.dbInitialized).toBe(false);
                expect(res.body.platform).toBe(process.platform);
            } finally {
                spy.mockRestore();
            }
        });
    });

    describe("CSRF & error handling", () => {
        it("rejects a mutating request carrying a bogus CSRF token (403)", async () => {
            await ctx.agent.post("/api/tree/load")
                .set("x-csrf-token", "bogustoken1234567890")
                .send({ noteIds: ["root"] })
                .expect(403);
        });

        it("accepts a valid CSRF token in a browser form body", async () => {
            const agent = supertest.agent(app);
            await agent.post("/login").send({ password: "demo1234" }).expect(302);
            const csrfToken = (await agent.get("/bootstrap").expect(200)).body.csrfToken;

            await agent.post("/logout")
                .type("form")
                .send({ "x-csrf-token": csrfToken })
                .expect(302);
        });

        it("returns a failed logout form navigation to the app, keeping any prefix", async () => {
            // "." resolves against the request URL, so /trilium/logout lands on /trilium/ rather
            // than the origin root; ".." would drop the prefix and strand the user outside the app.
            const res = await supertest(app).post("/logout")
                .type("form")
                .set("Accept", "text/html")
                .send({ "x-csrf-token": "bogustoken1234567890" })
                .expect(302);
            expect(res.headers.location).toBe(".");
        });

        it("returns a 404 body for an unknown route", async () => {
            const res = await supertest(app).get("/this-route-does-not-exist").expect(404);
            expect(res.body.message).toBeTruthy();
        });

        it("serves a [statusCode, string] handler result as plain text", async () => {
            // /api/login/token returns [401, "Incorrect credential"] on a bad
            // password — exercising apiResultHandler's array form and send()'s
            // text-error branch.
            const res = await supertest(app).post("/api/login/token").send({ password: "wrong" }).expect(401);
            expect(res.headers["content-type"]).toContain("text/plain");
            expect(res.text).toBe("Incorrect credential");
        });

        it("maps a thrown ValidationError to a 400 JSON body", async () => {
            const res = await ctx.agent.post("/api/database/anonymize/bogus")
                .set("x-csrf-token", ctx.csrfToken)
                .send({})
                .expect(400);
            expect(res.body.message).toContain("Invalid type");
        });

        it("handles a multipart file upload through the upload middleware", async () => {
            const { noteId } = await createTextNote(ctx, { title: "Upload target" });
            const res = await ctx.agent.put(`/api/notes/${noteId}/file`)
                .set("x-csrf-token", ctx.csrfToken)
                .attach("upload", Buffer.from("uploaded bytes"), { filename: "doc.txt", contentType: "text/plain" })
                .expect(200);
            expect(res.body.uploaded).toBe(true);
        });

        it("accepts a flat (non-bracketed) multipart field alongside the file", async () => {
            // fieldNestingDepth: 0 rejects only bracketed names; a flat field has zero brackets.
            const { noteId } = await createTextNote(ctx, { title: "Flat field target" });
            const res = await ctx.agent.put(`/api/notes/${noteId}/file`)
                .set("x-csrf-token", ctx.csrfToken)
                .field("description", "a plain field")
                .attach("upload", Buffer.from("uploaded bytes"), { filename: "doc.txt", contentType: "text/plain" })
                .expect(200);
            expect(res.body.uploaded).toBe(true);
        });

        it("rejects a nested (bracketed) multipart field name with 400 (CVE-2026-5079 guard)", async () => {
            // The fieldNestingDepth: 0 limit aborts with LIMIT_FIELD_NESTING, which the upload error
            // handler maps to a 400 instead of letting the request reach the route handler file-less.
            const { noteId } = await createTextNote(ctx, { title: "Nested field target" });
            const res = await ctx.agent.put(`/api/notes/${noteId}/file`)
                .set("x-csrf-token", ctx.csrfToken)
                .field("a[b][c]", "deep")
                .attach("upload", Buffer.from("uploaded bytes"), { filename: "doc.txt", contentType: "text/plain" })
                .expect(400);
            expect(res.text).toContain("nested multipart field names are not allowed");
        });
    });

    it("redirects /setup to the app when the DB is already initialized", async () => {
        await supertest(app).get("/setup").expect(302);
    });

    it("logs out an authenticated session", async () => {
        await ctx.agent.post("/logout").set("x-csrf-token", ctx.csrfToken).expect(302);
    });
});
