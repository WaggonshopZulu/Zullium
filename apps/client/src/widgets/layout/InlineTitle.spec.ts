import { describe, expect, it } from "vitest";

import { buildNote } from "../../test/easy-froca";
import { shouldShowInlineTitle } from "./InlineTitle";

describe("shouldShowInlineTitle", () => {
    const viewScope = { viewMode: "default" } as const;

    it("never renders, so the title stays in the row above the editor", () => {
        const textNote = buildNote({ title: "Note", type: "text" });
        const codeNote = buildNote({ title: "Script", type: "code", mime: "application/javascript;env=backend" });

        expect(shouldShowInlineTitle(textNote, "text", viewScope)).toBe(false);
        expect(shouldShowInlineTitle(codeNote, "code", viewScope)).toBe(false);
    });
});
