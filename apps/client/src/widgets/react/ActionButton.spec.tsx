import { Tooltip } from "bootstrap";
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/keyboard_actions.js", () => ({
    default: { getAction: vi.fn(async () => ({ actionName: "createNoteIntoInbox", effectiveShortcuts: [ "Ctrl+O" ] })) }
}));

import ActionButton from "./ActionButton";

describe("ActionButton", () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        render(null, container);
        container.remove();
        for (const orphan of document.querySelectorAll(".tooltip")) {
            orphan.remove();
        }
    });

    it("carries its name as a visible label by default, not only as a tooltip", async () => {
        await act(async () => render(
            <ActionButton icon="bx bx-plus" text="Add a new attribute" onClick={vi.fn()} />, container));

        const button = container.querySelector("button");
        expect(button?.textContent).toBe("Add a new attribute");
        // Nothing left for a tooltip to add: no keyboard shortcut, and the label already says the name.
        expect(Tooltip.getInstance(button as HTMLButtonElement)).toBeNull();
    });

    it("hideLabel keeps the old icon-only shape: no visible text, the name carried as the tooltip and the accessible name", async () => {
        const onClick = vi.fn();
        await act(async () => render(
            <ActionButton icon="bx bx-plus" text="Add a new attribute" onClick={onClick} hideLabel />, container));

        const button = container.querySelector("button");
        expect(button).not.toBeNull();
        expect(button?.textContent).toBe("");
        expect(button?.getAttribute("aria-label")).toBe("Add a new attribute");

        // The tooltip is shown by hovering/focusing in the real thing; neither is reliable under
        // happy-dom, so it is shown through the instance the hook registered.
        act(() => {
            if (button) Tooltip.getInstance(button)?.show();
        });
        expect(document.querySelector(".tooltip")?.textContent).toContain("Add a new attribute");

        act(() => button?.click());

        expect(document.querySelector(".tooltip")).toBeNull();
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("still tells a labeled button's keyboard shortcut through its tooltip", async () => {
        await act(async () => render(
            <ActionButton icon="bx bx-file-blank" text="New note" triggerCommand="createNoteIntoInbox" onClick={vi.fn()} />, container));
        // Flushes the state update the effect's own async getAction().then() schedules, which the
        // render's own act() callback (synchronous, no internal await) settles before that resolves.
        await act(async () => {});

        const button = container.querySelector("button");
        expect(button?.textContent).toBe("New note");

        act(() => {
            if (button) Tooltip.getInstance(button)?.show();
        });
        // formatShortcut() needs a real i18next instance for the modifier key's own name (not set up
        // in this bare unit test), so only the "O" itself is asserted, not "Ctrl"'s exact rendering.
        const tooltipText = document.querySelector(".tooltip")?.textContent;
        expect(tooltipText).toContain("O");
        expect(tooltipText).not.toContain("New note");
    });

});
