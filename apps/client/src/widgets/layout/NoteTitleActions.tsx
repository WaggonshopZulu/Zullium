import "./NoteTitleActions.css";

import { useEffect, useState } from "preact/hooks";

import NoteContext from "../../components/note_context";
import FNote from "../../entities/fnote";
import { t } from "../../services/i18n";
import { checkFullHeight, getExtendedWidgetType } from "../NoteDetail";
import { PromotedAttributesContent, usePromotedAttributeData } from "../PromotedAttributes";
import Collapsible, { ExternallyControlledCollapsible } from "../react/Collapsible";
import { useNoteContext, useNoteProperty, useTriliumEvent } from "../react/hooks";
import SearchDefinitionTab from "../ribbon/SearchDefinitionTab";

export default function NoteTitleActions() {
    const { note, ntxId, componentId, noteContext } = useNoteContext();
    const noteType = useNoteProperty(note, "type");

    return (
        <div className="title-actions">
            <PromotedAttributes note={note} componentId={componentId} noteContext={noteContext} />
            {noteType === "search" && <SearchProperties note={note} ntxId={ntxId} />}
        </div>
    );
}

function SearchProperties({ note, ntxId }: { note: FNote | null | undefined, ntxId: string | null | undefined }) {
    return (note &&
        <Collapsible
            title={t("search_definition.search_parameters")}
            initiallyExpanded={note.isInHiddenSubtree()} // not saved searches
        >
            <SearchDefinitionTab note={note} ntxId={ntxId} hidden={false} />
        </Collapsible>
    );
}

function PromotedAttributes({ note, componentId, noteContext }: {
    note: FNote | null | undefined,
    componentId: string,
    noteContext: NoteContext | undefined
}) {
    const [ cells, setCells ] = usePromotedAttributeData(note, componentId, noteContext);
    const [ expanded, setExpanded ] = useState(false);

    useEffect(() => {
        getExtendedWidgetType(note, noteContext).then(extendedNoteType => {
            const fullHeight = checkFullHeight(noteContext, extendedNoteType);
            setExpanded(!fullHeight);
        });
    }, [ note, noteContext ]);

    // Keyboard shortcut.
    useTriliumEvent("toggleRibbonTabPromotedAttributes", () => setExpanded(!expanded));

    if (!cells?.length) return false;
    return (note && (
        <ExternallyControlledCollapsible
            key={note.noteId}
            title={t("note_title.promoted_attributes")}
            expanded={expanded} setExpanded={setExpanded}
        >
            <PromotedAttributesContent note={note} componentId={componentId} cells={cells} setCells={setCells} />
        </ExternallyControlledCollapsible>
    ));
}
