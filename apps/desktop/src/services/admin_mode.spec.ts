import { describe, expect, it } from "vitest";

import { wantsAdminMode } from "./admin_mode.js";

describe("wantsAdminMode", () => {
    it("is true only when the exact --admin flag is present", () => {
        expect(wantsAdminMode([ "zullium.exe", "--admin" ])).toBe(true);
        expect(wantsAdminMode([ "zullium.exe" ])).toBe(false);
        expect(wantsAdminMode([ "zullium.exe", "--new-window" ])).toBe(false);
        // Not a loose match against a flag that merely contains "admin".
        expect(wantsAdminMode([ "zullium.exe", "--administrator" ])).toBe(false);
    });
});
