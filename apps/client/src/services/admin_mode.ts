import { t } from "./i18n.js";
import toastService from "./toast.js";

/**
 * Whether this window was opened through Andrew's separate admin launch shortcut (Phase 2
 * blueprint, "Admin-Gated Entry Point" — option C, approved), never through the guard-facing one.
 *
 * The desktop main process appends `?admin=1` to the URL only a window it built that way loads
 * (see `apps/desktop/src/services/window.ts`'s two `loadURL` calls); every guard window's URL
 * never carries it, for the life of that window. Read once and cached — the marker cannot change
 * without a fresh window, the same way `isMobile()` caches `window.glob.device`.
 */
const cachedIsAdminMode = /[?&]admin=1(?:&|$)/.test(window.location.search);

export function isAdminMode() {
    return cachedIsAdminMode;
}

/**
 * Guards an admin-only command: in admin mode, awaits and returns whatever `action` returns;
 * otherwise tells the guard why nothing happened rather than staying silent, and resolves
 * `undefined` without running it.
 */
export async function requireAdminMode<T>(action: () => T | Promise<T>): Promise<T | undefined> {
    if (!isAdminMode()) {
        toastService.showError(t("admin_mode.admin_only"));
        return undefined;
    }

    return await action();
}
