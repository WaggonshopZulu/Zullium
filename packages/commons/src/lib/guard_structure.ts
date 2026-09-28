/** The Shift Log branch: the calendar root, holding one note per day, newest first. */
export const SHIFT_LOG_NOTE_ID = "shiftLogRoot";

/** The Reference branch: the static protocol, contact and vendor pages. */
export const REFERENCE_NOTE_ID = "referenceRoot";

/** The two top-level branches of the sidebar. Neither can be deleted. */
export const GUARD_ROOT_NOTE_IDS: readonly string[] = [ SHIFT_LOG_NOTE_ID, REFERENCE_NOTE_ID ];
