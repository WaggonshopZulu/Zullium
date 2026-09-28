import { Tooltip } from "bootstrap";
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `isMobile()` is read once, when the module loads, so the touch branch needs a file of its own; the
 * pointer behaviour is what `ActionButton.spec.tsx` covers.
 */
vi.mock("../../services/utils", async (importOriginal) => ({
    ...await importOriginal<typeof import("../../services/utils")>(),
    isMobile: () => true
}));

import ActionButton from "./ActionButton";

describe("ActionButton on a touch screen", () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        render(null, container);
        container.remove();
    });

    it("declines its tooltip where asked, handing the label to assistive technology instead", async () => {
        await act(async () => render(
            <ActionButton icon="bx bx-arrow-back" text="Back" noTooltipOnTouch />, container));

        const button = container.querySelector("button");

        // Nothing to open with the tap that presses the button, and the name is still given.
        expect(button && Tooltip.getInstance(button)).toBeNull();
        expect(button?.getAttribute("aria-label")).toBe("Back");
    });

    it("carries no tooltip for an ordinary labeled button with nothing left for one to add", async () => {
        await act(async () => render(
            <ActionButton icon="bx bx-refresh" text="Measure again" />, container));

        const button = container.querySelector("button");

        // The visible label already names the button; with no keyboard shortcut, a tooltip would
        // have nothing to say that is not already on screen.
        expect(button?.textContent).toBe("Measure again");
        expect(button && Tooltip.getInstance(button)).toBeNull();
        expect(button?.getAttribute("aria-label")).toBeNull();
    });

    it("keeps the tooltip, on a tap, for an icon-only button that did not ask to decline it", async () => {
        await act(async () => render(
            <ActionButton icon="bx bx-refresh" text="Measure again" hideLabel />, container));

        const button = container.querySelector("button");

        expect(button && Tooltip.getInstance(button)).not.toBeNull();
        expect(button?.getAttribute("aria-label")).toBe("Measure again");
    });
});
