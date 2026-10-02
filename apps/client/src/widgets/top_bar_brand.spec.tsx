import { describe, expect, it } from "vitest";

import { renderInto } from "../test/render";
import TopBarBrand, { formatClock } from "./top_bar_brand";

describe("TopBarBrand", () => {
    it("pads the local time to HH:MM:SS", () => {
        expect(formatClock(new Date(2026, 8, 30, 7, 5, 9))).toBe("07:05:09");
        expect(formatClock(new Date(2026, 8, 30, 23, 55, 0))).toBe("23:55:00");
    });

    it("shows the wordmark and a time", () => {
        const container = renderInto(<TopBarBrand />);

        expect(container.querySelector(".top-bar-wordmark")?.getAttribute("aria-label")).toBe("ZULU ONE - Security");
        expect(container.querySelector(".top-bar-wordmark-name")?.textContent).toBe("Zulu One");
        expect(container.querySelector(".top-bar-wordmark-sub")?.textContent).toBe("Security");
        expect(container.querySelector(".top-bar-clock")?.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
});
