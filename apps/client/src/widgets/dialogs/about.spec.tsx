/**
 * The rebranded About dialog. What matters here is that nothing Trilium-branded survives: the
 * heading, the footer and the attribution line are this build's own, and the community-oriented
 * parts of the original dialog (contributors, GitHub, donate) are gone entirely rather than hidden.
 */
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Component from "../../components/component";
import { renderInto } from "../../test/render";
import { ParentComponent } from "../react/react_utils";
import AboutDialog from "./about";

vi.mock("../../services/i18n", () => ({ t: (key: string, values?: object) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock("react-i18next", () => ({
    Trans: ({ values }: { values: Record<string, string> }) => <span>{Object.values(values).join(" ")}</span>
}));
vi.mock("../../services/server", () => ({
    default: {
        get: vi.fn(async (url: string) => (url === "app-info"
            ? {
                appVersion: "1.2.3",
                dbVersion: "42",
                syncVersion: "9",
                buildDate: "2026-09-27T00:00:00Z",
                buildRevision: "abcdef1234567890",
                dataDirectory: "C:\\Zullium\\data"
            }
            : []))
    }
}));

describe("AboutDialog", () => {
    let host: Component;
    let container: HTMLElement;

    beforeEach(() => {
        host = new Component();
        container = renderInto(
            <ParentComponent.Provider value={host}>
                <AboutDialog />
            </ParentComponent.Provider>
        );
    });

    async function open() {
        await act(async () => {
            await host.handleEventInChildren("openAboutDialog", {});
        });
    }

    it("names this build, never Trilium, in the heading", async () => {
        await open();
        expect(container.querySelector("h2")?.textContent).toBe("Daily Brief Logbook");
        expect(container.textContent).not.toContain("Trilium");
    });

    it("carries no community links: no contributors, GitHub or donate", async () => {
        await open();

        expect(container.querySelector(".contributor-list")).toBeNull();
        expect(container.textContent).not.toMatch(/contributor/i);
        for (const host of [ "github.com", "triliumnotes.org" ]) {
            expect([ ...container.querySelectorAll("a") ].some((a) => a.href.includes(host))).toBe(false);
        }
    });

    it("keeps the version, build and data-directory info, and a licence link", async () => {
        await open();

        expect(container.textContent).toContain("1.2.3");
        expect(container.textContent).toContain("abcdef1");
        expect(container.textContent).toContain("C:\\Zullium\\data");

        const licenseLink = [ ...container.querySelectorAll("a") ].find((a) => a.href.includes("agpl-3.0"));
        expect(licenseLink).toBeDefined();
    });

    it("stays closed until the event fires", () => {
        expect(container.querySelector(".modal.show")).toBeNull();
    });
});
