import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    stored: {} as Record<string, string>,
    saved: [] as [ string, unknown ][],
    post: vi.fn(async (_url: string) => ({})),
    showMessage: vi.fn()
}));

vi.mock("../../../services/i18n", () => ({ t: (key: string) => key }));

vi.mock("../../../services/server", () => ({
    default: {
        post: mocks.post,
        get: async (url: string) => (url === "keyboard-actions" ? [] : {})
    }
}));

vi.mock("../../../services/toast", () => ({
    default: { showMessage: mocks.showMessage }
}));

vi.mock("../../react/hooks", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../react/hooks")>()),
    useTriliumOption: (name: string) => [
        mocks.stored[name] ?? "",
        (value: string) => void mocks.saved.push([ name, value ])
    ],
    useTriliumOptionBool: (name: string) => [
        mocks.stored[name] === "true",
        (value: boolean) => void mocks.saved.push([ name, value ])
    ]
}));

vi.mock("./components/OptionsPageHeader", () => ({ default: () => <div className="header-stub" /> }));

import OtherSettings from "./other";

let host: HTMLElement;

beforeEach(() => {
    mocks.stored = {
        revisionSnapshotTimeInterval: "600", revisionSnapshotTimeIntervalTimeScale: "1",
        revisionSnapshotNumberLimit: "-1"
    };
    mocks.saved = [];
    host = document.body.appendChild(document.createElement("div"));
});

afterEach(() => {
    render(null, host);
    document.body.innerHTML = "";
    vi.clearAllMocks();
});

function open() {
    act(() => {
        render(null, host);
        render(<OtherSettings />, host);
    });
}

const button = (name: string) => host.querySelector<HTMLButtonElement>(`button[name='${name}']`);

describe("the revision snapshot limit", () => {
    it("holds the erase action out of reach while every snapshot is being kept", () => {
        open();
        // A negative limit keeps everything, so there is no excess for the action to drop.
        expect(button("erase-excess-revisions-button")?.disabled).toBe(true);

        mocks.stored = { ...mocks.stored, revisionSnapshotNumberLimit: "10" };
        open();
        expect(button("erase-excess-revisions-button")?.disabled).toBe(false);
    });

    it("holds a limit typed below the keep-everything one up to it, rather than storing nonsense", () => {
        mocks.stored = { ...mocks.stored, revisionSnapshotNumberLimit: "10" };
        open();

        // Two number inputs remain on the trimmed page: the snapshot interval's own TimeSelector
        // spinner, then this one — the only one that is a count rather than a time.
        const box = [ ...host.querySelectorAll<HTMLInputElement>("input[type='number']") ].at(-1);
        act(() => {
            if (box) {
                box.value = "-5";
                box.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });

        expect(mocks.saved.at(-1)).toEqual([ "revisionSnapshotNumberLimit", -1 ]);
    });

    it("erases excess snapshots on request", async () => {
        mocks.stored = { ...mocks.stored, revisionSnapshotNumberLimit: "10" };
        open();

        await act(async () => button("erase-excess-revisions-button")?.click());

        expect(mocks.post).toHaveBeenCalledWith("revisions/erase-all-excess-revisions");
        expect(mocks.showMessage).toHaveBeenCalled();
    });
});
