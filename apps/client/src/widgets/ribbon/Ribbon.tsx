import "./Ribbon.css";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";

import { Indexed, numberObjectsInPlace } from "../../services/utils";
import { useNoteContext, useNoteProperty } from "../react/hooks";
import { shouldShowTab, TabConfiguration, TitleContext } from "./ribbon-interface";
import { RIBBON_TAB_DEFINITIONS } from "./RibbonDefinition";

const TAB_CONFIGURATION = numberObjectsInPlace<TabConfiguration>(RIBBON_TAB_DEFINITIONS);

interface ComputedTab extends Indexed<TabConfiguration> {
    shouldShow: boolean;
}

export default function Ribbon() {
    const { note, ntxId, hoistedNoteId, notePath, noteContext, componentId, isReadOnlyTemporarilyDisabled } = useNoteContext();
    const noteType = useNoteProperty(note, "type");
    const [ activeTabIndex, setActiveTabIndex ] = useState<number | undefined>();
    const [ computedTabs, setComputedTabs ] = useState<ComputedTab[]>();
    const titleContext: TitleContext = useMemo(() => ({
        note,
        noteContext
    }), [ note, noteContext ]);

    async function refresh() {
        const computedTabs: ComputedTab[] = [];
        for (const tab of TAB_CONFIGURATION) {
            const shouldShow = await shouldShowTab(tab.show, titleContext);
            computedTabs.push({
                ...tab,
                shouldShow: !!shouldShow
            });
        }
        setComputedTabs(computedTabs);
    }

    useEffect(() => {
        refresh();
    }, [ note, noteType, isReadOnlyTemporarilyDisabled ]);

    // Automatically activate the first ribbon tab that needs to be activated whenever a note changes.
    useEffect(() => {
        if (!computedTabs) return;
        const tabToActivate = computedTabs.find(tab => tab.shouldShow && (typeof tab.activate === "boolean" ? tab.activate : tab.activate?.(titleContext)));
        setActiveTabIndex(tabToActivate?.index);
    }, [ computedTabs, note?.noteId ]);

    const shouldShowRibbon = (noteContext?.viewScope?.viewMode === "default" && !noteContext.noteId?.startsWith("_options"));
    return (
        <div
            className={clsx("ribbon-container", !shouldShowRibbon && "hidden-ext")}
            style={{ contain: "none" }}
        >
            <div className="ribbon-body-container">
                {computedTabs && computedTabs.map(tab => {
                    const isActive = tab.index === activeTabIndex;
                    if (!isActive && !tab.stayInDom) {
                        return;
                    }

                    const TabContent = tab.content;

                    return (
                        <div className={`ribbon-body ${!isActive ? "hidden-ext" : ""}`}>
                            <TabContent
                                note={note}
                                hidden={!isActive}
                                ntxId={ntxId}
                                hoistedNoteId={hoistedNoteId}
                                notePath={notePath}
                                noteContext={noteContext}
                                componentId={componentId}
                                activate={useCallback(() => {
                                    setActiveTabIndex(tab.index);
                                }, [setActiveTabIndex])}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
