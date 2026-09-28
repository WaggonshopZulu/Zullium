import { describe, expect, it } from "vitest";

import { renderInto } from "../test/render";
import SidebarBrandHeader from "./sidebar_brand_header";

describe("SidebarBrandHeader", () => {
    it("shows the app name beside a decorative, non-announced crest", () => {
        const container = renderInto(<SidebarBrandHeader />);

        expect(container.textContent).toBe("Daily Brief Logbook");

        const img = container.querySelector("img");
        expect(img).not.toBeNull();
        expect(img?.getAttribute("alt")).toBe("");
        expect(img?.getAttribute("aria-hidden")).toBe("true");
    });
});
