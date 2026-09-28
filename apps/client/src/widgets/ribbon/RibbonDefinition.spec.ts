import { describe, expect, it, vi } from "vitest";

vi.mock("../../services/i18n", () => ({ t: (key: string) => key }));

import { RIBBON_TAB_DEFINITIONS } from "./RibbonDefinition";

describe("RIBBON_TAB_DEFINITIONS", () => {
    it("holds the formatting bar and the saved-search parameters, and nothing else", () => {
        expect(RIBBON_TAB_DEFINITIONS.map((tab) => tab.title)).toStrictEqual([
            "classic_editor_toolbar.title",
            "search_definition.search_parameters"
        ]);
    });

    it("has no keyboard command that could collapse the formatting bar", () => {
        expect(RIBBON_TAB_DEFINITIONS.some((tab) => tab.toggleCommand)).toBe(false);
    });

    it("shows the search parameters only on a search note", () => {
        const search = RIBBON_TAB_DEFINITIONS[1];
        const show = search.show as (context: { note?: { type: string } }) => boolean;

        expect(show({ note: { type: "search" } })).toBe(true);
        expect(show({ note: { type: "text" } })).toBe(false);
        expect(show({})).toBe(false);
    });
});
