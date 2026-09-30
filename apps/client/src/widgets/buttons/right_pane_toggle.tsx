import clsx from "clsx";

import { t } from "../../services/i18n";
import options from "../../services/options";
import ActionButton from "../react/ActionButton";
import { useState, useCallback } from "preact/hooks";
import { useTriliumEvent } from "../react/hooks";

export default function RightPaneToggle() {
    const [ rightPaneVisible, setRightPaneVisible ] = useState(options.is("rightPaneVisible"));

    useTriliumEvent("toggleRightPane", useCallback(() => {
        setRightPaneVisible(current => !current);
    }, []));

    return (
        <ActionButton
            className={clsx(
                `toggle-button right-pane-toggle-button bx-flip-horizontal`,
                rightPaneVisible ? "action-collapse" : "action-expand"
            )}
            text={t("right_pane.toggle")}
            icon="bx bx-sidebar"
            triggerCommand="toggleRightPane"
            // The tab row is the one strip in the app with no room to give: tabs, history
            // buttons and the new-tab button already compete for it, and this button sits
            // last in line with nothing to stop a label running off the window's own edge
            // (measured 82px past a 1600px-wide window). The name still reaches the reader,
            // as a tooltip and an aria-label, just not as permanently visible text — the same
            // exception ActionButton's hideLabel exists for.
            hideLabel
        />
    );
}
