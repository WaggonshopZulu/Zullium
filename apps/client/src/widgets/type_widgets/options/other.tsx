import { t } from "../../../services/i18n";
import server from "../../../services/server";
import toast from "../../../services/toast";
import Button from "../../react/Button";
import { Card, OptionCardSection } from "../../react/Card";
import { FormTextBoxWithUnit } from "../../react/FormTextBox";
import FormToggle from "../../react/FormToggle";
import { useTriliumOption, useTriliumOptionBool } from "../../react/hooks";
import OptionsPageHeader from "./components/OptionsPageHeader";
import TimeSelector from "./components/TimeSelector";

/**
 * Trimmed down from Trilium's original "Other" settings page (search, erasure timeouts, HTML
 * import tags, share, network) to the one card three call sites still link to — revisions.tsx,
 * recent_changes.tsx and space_usage/context_menu.ts each open this page to change the revision
 * snapshot interval or limit. The rest of the original page was cut in the Phase 1 audit along
 * with every other settings page except Shortcuts and Backup.
 */
export default function OtherSettings() {
    return (
        <>
            <OptionsPageHeader />
            <RevisionSettings />
        </>
    );
}

function RevisionSettings() {
    const [ revisionSnapshotNumberLimit, setRevisionSnapshotNumberLimit ] = useTriliumOption("revisionSnapshotNumberLimit");
    const [ revisionIgnoreNamedSnapshots, setRevisionIgnoreNamedSnapshots ] = useTriliumOptionBool("revisionIgnoreNamedSnapshots");

    return (
        <Card heading={t("revisions_snapshot.title")}>
            <OptionCardSection

                name="revision-snapshot-time-interval"
                label={t("revisions_snapshot_interval.snapshot_time_interval_label")}
                description={t("revisions_snapshot_interval.note_revisions_snapshot_description_short")}
            >
                <TimeSelector
                    name="revision-snapshot-time-interval"
                    optionValueId="revisionSnapshotTimeInterval" optionTimeScaleId="revisionSnapshotTimeIntervalTimeScale"
                    minimumSeconds={10}
                />
            </OptionCardSection>

            <OptionCardSection

                name="revision-snapshot-number-limit"
                label={t("revisions_snapshot_limit.snapshot_number_limit_label")}
                description={t("revisions_snapshot_limit.note_revisions_snapshot_limit_description_short")}
            >
                <FormTextBoxWithUnit
                    type="number" min={-1}
                    currentValue={revisionSnapshotNumberLimit}
                    unit={t("revisions_snapshot_limit.snapshot_number_limit_unit")}
                    onBlur={value => {
                        const newValue = parseInt(value, 10);
                        if (!isNaN(newValue) && newValue >= -1) {
                            setRevisionSnapshotNumberLimit(newValue);
                        }
                    }}
                />
            </OptionCardSection>

            <OptionCardSection
                name="revision-keep-named-snapshots"
                label={t("revisions_snapshot_limit.keep_named_revisions_label")}
                description={t("revisions_snapshot_limit.keep_named_revisions_description")}
            >
                <FormToggle currentValue={revisionIgnoreNamedSnapshots} onChange={setRevisionIgnoreNamedSnapshots} />
            </OptionCardSection>

            <OptionCardSection
                label={t("revisions_snapshot_limit.erase_excess_revision_snapshots")}
                description={t("revisions_snapshot_limit.erase_excess_revision_snapshots_description")}
            >
                <Button
                    name="erase-excess-revisions-button"
                    text={t("revisions_snapshot_limit.erase_now_button")}
                    size="micro"
                    // A negative limit keeps every snapshot, so nothing is excess and the erasure
                    // would report success having dropped nothing. Offered again as soon as a
                    // limit is set.
                    disabled={parseInt(revisionSnapshotNumberLimit, 10) < 0}
                    onClick={async () => {
                        await server.post("revisions/erase-all-excess-revisions");
                        toast.showMessage(t("revisions_snapshot_limit.erase_excess_revision_snapshots_prompt"));
                    }}
                />
            </OptionCardSection>
        </Card>
    );
}
