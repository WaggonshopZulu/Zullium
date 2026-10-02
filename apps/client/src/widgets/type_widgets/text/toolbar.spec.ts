import { describe, expect, it } from "vitest";

import { FONT_COLORS, FONT_FAMILIES, FONT_SIZES, HIGHLIGHT_COLORS } from "./guard_palette.js";
import { buildToolbarConfig, TOOLBAR_ITEMS, usesClassicToolbar } from "./toolbar.js";

describe("buildToolbarConfig", () => {
    it("offers exactly the blueprint's items and nothing else", () => {
        const items = buildToolbarConfig().toolbar.items.filter((item) => item !== "|");

        expect(items).toStrictEqual([
            "bold", "italic", "underline",
            "fontBackgroundColor", "fontColor",
            "fontFamily", "fontSize",
            "bulletedList", "numberedList",
            "insertTable",
            "imageUpload", "attachFile",
            "findInNote"
        ]);
    });

    it("gives the floating toolbar no block toolbar and no groups", () => {
        const config = buildToolbarConfig();

        expect("blockToolbar" in config).toBe(false);
        expect(config.toolbar.items.some((item) => typeof item === "object")).toBe(false);
        expect(config.toolbar.shouldNotGroupWhenFull).toBe(true);
    });

    it("returns a copy, so a caller cannot change the shared item list", () => {
        buildToolbarConfig().toolbar.items.push("code");

        expect(TOOLBAR_ITEMS).not.toContain("code");
    });
});

describe("usesClassicToolbar", () => {
    it("is the classic bar unless a narrow view asked for the floating one", () => {
        expect(usesClassicToolbar({})).toBe(true);
        expect(usesClassicToolbar({ floatingToolbarRequested: false })).toBe(true);
        expect(usesClassicToolbar({ floatingToolbarRequested: true })).toBe(false);
    });
});

describe("palettes", () => {
    it("lists OneNote's sixteen highlight colors with Yellow first, in the approved yellow", () => {
        expect(HIGHLIGHT_COLORS).toHaveLength(16);
        expect(HIGHLIGHT_COLORS[0]).toStrictEqual({ color: "#fde047", label: "Yellow" });
        expect(HIGHLIGHT_COLORS.map((swatch) => swatch.label).slice(1, 4)).toStrictEqual([ "Bright Green", "Turquoise", "Pink" ]);
    });

    it("lists OneNote's ten standard font colors, dark red first", () => {
        expect(FONT_COLORS.map((swatch) => swatch.label)).toStrictEqual([
            "Dark Red", "Red", "Orange", "Yellow", "Light Green", "Green", "Light Blue", "Blue", "Dark Blue", "Purple"
        ]);
    });

    it("never repeats a color within a palette", () => {
        for (const palette of [ HIGHLIGHT_COLORS, FONT_COLORS ]) {
            const colors = palette.map((swatch) => swatch.color);
            expect(new Set(colors).size).toBe(colors.length);
        }
    });

    it("offers a default face first and ascending sizes", () => {
        expect(FONT_FAMILIES[0]).toBe("default");
        expect(FONT_SIZES).toStrictEqual([ ...FONT_SIZES ].sort((a, b) => a - b));
    });
});
