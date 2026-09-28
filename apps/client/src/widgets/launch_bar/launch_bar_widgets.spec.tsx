import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

// A single fake Bootstrap dropdown instance, matching Dropdown.spec.tsx's own pattern — this
// mounts the real Dropdown component, just without real Bootstrap/Popper behind it.
const { getOrCreateInstance } = vi.hoisted(() => {
    const instance = { show: vi.fn(), hide: vi.fn(), update: vi.fn(), dispose: vi.fn(), _menu: null as HTMLElement | null };
    return { getOrCreateInstance: vi.fn(() => instance) };
});
vi.mock("bootstrap", () => ({ Dropdown: { getOrCreateInstance }, Tooltip: class {} }));

// Sidesteps the real Bootstrap Tooltip machinery, matching Dropdown.spec.tsx's own pattern.
const tooltipStub = vi.hoisted(() => ({ showTooltip: vi.fn(), hideTooltip: vi.fn() }));
vi.mock("../react/hooks", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../react/hooks")>()),
    useTooltip: () => tooltipStub
}));

import { LaunchBarDropdownButton } from "./launch_bar_widgets";

describe("LaunchBarDropdownButton", () => {
    afterEach(() => vi.restoreAllMocks());

    it("shows the launcher's name as a visible label beside the icon, not only as a tooltip", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        await act(async () => render(
            <LaunchBarDropdownButton icon="bx bx-bookmark" title="Bookmarks">
                <div>menu content</div>
            </LaunchBarDropdownButton>, container));

        const button = container.querySelector("button.right-dropdown-button");
        expect(button?.querySelector(".action-button-label")?.textContent).toBe("Bookmarks");
        expect(button?.querySelector(".bx-bookmark")).not.toBeNull();

        render(null, container);
        container.remove();
    });
});
