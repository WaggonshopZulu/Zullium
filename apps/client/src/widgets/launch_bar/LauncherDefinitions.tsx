import { useContext, useMemo } from "preact/hooks";

import appContext, { CommandNames } from "../../components/app_context";
import FNote from "../../entities/fnote";
import date_notes from "../../services/date_notes";
import { t } from "../../services/i18n";
import toast from "../../services/toast";
import { isMobile } from "../../services/utils";
import BasicWidget from "../basic_widget";
import QuickSearchWidget from "../quick_search";
import { useLegacyWidget, useNoteLabel } from "../react/hooks";
import { ParentComponent } from "../react/react_utils";
import { CustomNoteLauncher } from "./GenericButtons";
import { LaunchBarActionButton, LaunchBarContext, launcherContextMenuHandler, LauncherNoteProps, useLauncherIconAndTitle } from "./launch_bar_widgets";

export function CommandButton({ launcherNote }: LauncherNoteProps) {
    const { icon, title } = useLauncherIconAndTitle(launcherNote);
    const [ command ] = useNoteLabel(launcherNote, "command");

    return command && (
        <LaunchBarActionButton
            launcherNote={launcherNote}
            icon={icon}
            text={title}
            triggerCommand={command as CommandNames}
        />
    );
}

// we're intentionally displaying the launcher title and icon instead of the target,
// e.g. you want to make launchers to 2 mermaid diagrams which both have mermaid icon (ok),
// but on the launchpad you want them distinguishable.
// for titles, the note titles may follow a different scheme than maybe desirable on the launchpad
// another reason is the discrepancy between what user sees on the launchpad and in the config (esp. icons).
// The only downside is more work in setting up the typical case
// where you actually want to have both title and icon in sync, but for those cases there are bookmarks
export function NoteLauncher({ launcherNote, ...restProps }: { launcherNote: FNote, hoistedNoteId?: string }) {
    return (
        <CustomNoteLauncher
            launcherNote={launcherNote}
            getTargetNoteId={(launcherNote) => {
                const targetNoteId = launcherNote.getRelationValue("target");
                if (!targetNoteId) {
                    toast.showError(t("note_launcher.this_launcher_doesnt_define_target_note"));
                    return null;
                }
                return targetNoteId;
            }}
            getHoistedNoteId={launcherNote => launcherNote.getRelationValue("hoistedNote")}
            {...restProps}
        />
    );
}

export function TodayLauncher({ launcherNote }: LauncherNoteProps) {
    return (
        <CustomNoteLauncher
            launcherNote={launcherNote}
            getTargetNoteId={async () => {
                const todayNote = await date_notes.getTodayNote();
                return todayNote?.noteId ?? null;
            }}
        />
    );
}

export function QuickSearchLauncherWidget({ launcherNote }: LauncherNoteProps) {
    const { isHorizontalLayout } = useContext(LaunchBarContext);
    const widget = useMemo(() => new QuickSearchWidget(), []);
    const parentComponent = useContext(ParentComponent) as BasicWidget | null;
    const isEnabled = isHorizontalLayout && !isMobile();
    parentComponent?.contentSized();

    return (
        <div onContextMenu={launcherContextMenuHandler(launcherNote)}>
            {isEnabled && <LegacyWidgetRenderer widget={widget} />}
        </div>
    );
}

export function LegacyWidgetRenderer({ widget }: { widget: BasicWidget }) {
    const [ widgetEl ] = useLegacyWidget(() => widget, {
        noteContext: appContext.tabManager.getActiveContext() ?? undefined
    });

    return widgetEl;
}


