import { TypeWidgetProps } from "./type_widget";
import { JSX } from "preact/jsx-runtime";
import ShortcutSettings from "./options/shortcuts";
import BackupSettings from "./options/backup";
import OtherSettings from "./options/other";
import "./ContentWidget.css";
import { t } from "../../services/i18n";
import BackendLog from "./code/BackendLog";
import SpaceUsage from "./space_usage";

// Almost every other settings page was cut for the guard build (see Phase 1 audit). Shortcuts,
// Backup and Other survive, but only reachable through the admin-mode entry point -- none of the
// note IDs below are children of the guard-facing "_options" tree any more (see hidden_subtree.ts).
// Other is trimmed to just the revision-snapshot card three dialogs elsewhere link to; see
// options/other.tsx.
export type OptionPages = "_optionsShortcuts" | "_optionsBackup" | "_optionsOther";

/** The page behind each of these notes. Exported for the options search, which renders them all. */
export const CONTENT_WIDGETS: Record<OptionPages | "_backendLog" | "_spaceUsage", (props: TypeWidgetProps) => JSX.Element> = {
    _optionsShortcuts: ShortcutSettings,
    _optionsBackup: BackupSettings,
    _optionsOther: OtherSettings,
    _backendLog: BackendLog,
    _spaceUsage: SpaceUsage
}

/**
 * Type widget that displays one or more widgets based on the type of note, generally used for options and other interactive notes such as the backend log.
 *
 * @param param0
 * @returns
 */
export default function ContentWidget({ note, ...restProps }: TypeWidgetProps) {
    const Content = CONTENT_WIDGETS[note.noteId];
    return (
        <div className={`note-detail-content-widget-content ${note.noteId.startsWith("_options") ? "options" : ""}`}>
            {Content
                ? <Content note={note} {...restProps} />
                : (t("content_widget.unknown_widget", { id: note.noteId }))}
        </div>
    )
}
