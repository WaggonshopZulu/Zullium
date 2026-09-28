import { t } from "../services/i18n.js";
import { isMobile, reloadFrontendApp } from "../services/utils.js";
import contextMenu, { type ContextMenuEvent, type MenuItem } from "./context_menu.js";
import options from "../services/options.js";

export interface ShowLauncherContextMenuOptions<T extends string> {
    /** Menu items specific to this launcher (e.g. "Open in new tab" for note-based launchers). */
    extraItems?: MenuItem<T>[];
    /** Handler for the {@link extraItems}. */
    onCommand?: (command: T | undefined) => void;
}

/**
 * Displays the launch bar icon context menu: the shared launch-bar management segment (layout
 * orientation only — see {@link buildLaunchBarManagementItems}), plus whichever launcher-specific
 * items are supplied (e.g. "Open in new tab" for note-based launchers).
 *
 * "Configure launch bar" and "Remove from launch bar" are deliberately not offered here: the
 * launch bar in this build ships with a fixed set of icons (Phase 2 blueprint, Launch Bar
 * Lockdown), so there is no guard-facing way to add, remove or rearrange them. The underlying
 * capability (the `_lbRoot` tree, `showLaunchBarSubtree`) is untouched for a future admin mode —
 * only the entry points into it are gone.
 */
export async function showLauncherContextMenu<T extends string>(
    launcherNote: unknown,
    e: ContextMenuEvent,
    menuOptions: ShowLauncherContextMenuOptions<T> = {}
) {
    e.preventDefault();

    const widgetItems = [...(menuOptions.extraItems ?? [])] as MenuItem<string>[];

    const items = buildLaunchBarManagementItems();
    if (widgetItems.length > 0) {
        items.push({ kind: "separator" }, ...widgetItems);
    }

    contextMenu.show<string>({
        x: e.pageX ?? 0,
        y: e.pageY ?? 0,
        items,
        selectMenuItemHandler: ({ command }) => menuOptions.onCommand?.(command as T | undefined)
    });
}

/**
 * Builds the shared segment shown at the top of every launch-bar context menu: the "Launch bar
 * orientation" submenu on desktop, nothing on mobile (always horizontal there). Each item is
 * self-contained via its own {@link MenuCommandItem.handler}, so it works regardless of the
 * widget-specific `onCommand` router.
 */
function buildLaunchBarManagementItems(): MenuItem<string>[] {
    if (isMobile()) {
        return [];
    }

    const orientation = options.get("layoutOrientation");
    return [{
        title: t("launcher_button_context_menu.launch_bar_orientation"),
        uiIcon: "bx bx-layout",
        items: [
            buildOrientationItem("vertical", orientation),
            buildOrientationItem("horizontal", orientation)
        ]
    }];
}

function buildOrientationItem(target: "vertical" | "horizontal", currentOrientation: string): MenuItem<string> {
    const isCurrent = currentOrientation === target;
    const label = target === "vertical" ? t("theme.layout-vertical-title") : t("theme.layout-horizontal-title");
    return {
        // The unchecked item triggers a reload when picked, so hint that after its label.
        title: isCurrent ? label : `${label} ${t("launcher_button_context_menu.will_reload_frontend")}`,
        // `bx-empty` reserves the icon slot so unchecked items stay aligned with the checked one.
        uiIcon: "bx bx-empty",
        checked: isCurrent,
        handler: () => setLayoutOrientation(target)
    };
}

async function setLayoutOrientation(orientation: "vertical" | "horizontal") {
    if (options.get("layoutOrientation") === orientation) {
        return;
    }

    await options.save("layoutOrientation", orientation);
    // The layout tree and body classes are computed once at boot, so a reload is required to apply the change.
    reloadFrontendApp(`layout orientation change: ${orientation}`);
}
