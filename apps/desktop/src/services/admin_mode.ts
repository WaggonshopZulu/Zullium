/**
 * The command-line flag that opens a window in admin mode: reachable only through a separate
 * launch shortcut Andrew keeps off the shared desktop (Phase 2 blueprint, "Admin-Gated Entry
 * Point" — option C, approved). A window opened this way carries `?admin=1` in the URL it loads
 * (see the two `loadURL` call sites in window.ts), which
 * `apps/client/src/services/admin_mode.ts` reads at startup; everything a guard's window can
 * reach stays exactly as it is, since that window's URL never carries the marker.
 */
const ADMIN_MODE_FLAG = "--admin";

/** Whether `argv` (a full launch, or a second instance's forwarded command line) asks for admin mode. */
export function wantsAdminMode(argv: string[]): boolean {
    return argv.includes(ADMIN_MODE_FLAG);
}
