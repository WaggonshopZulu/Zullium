import { TypeWidgetProps } from "./type_widget";
import { JSX } from "preact/jsx-runtime";
import ShortcutSettings from "./options/shortcuts";
import BackupSettings from "./options/backup";
import "./ContentWidget.css";
import { t } from "../../services/i18n";
import BackendLog from "./code/BackendLog";
import SpaceUsage from "./space_usage";

// Every other settings page was cut for the guard build (see Phase 1 audit). Shortcuts and Backup
// survive, but only reachable through the admin-mode entry point -- neither note ID below is a
// child of the guard-facing "_options" tree any more (see hidden_subtree.ts).
export type OptionPages = "_optionsShortcuts" | "_optionsBackup";

/** The page behind each of these notes. Exported for the options search, which renders them all. */
export const CONTENT_WIDGETS: Record<OptionPages | "_backendLog" | "_spaceUsage", (props: TypeWidgetProps) => JSX.Element> = {
    _optionsShortcuts: ShortcutSettings,
    _optionsBackup: BackupSettings,
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
