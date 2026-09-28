import { t } from "../../services/i18n";
import FormattingToolbar, { showFormattingToolbar } from "./FormattingToolbar";
import { TabConfiguration } from "./ribbon-interface";
import SearchDefinitionTab from "./SearchDefinitionTab";

/**
 * The ribbon holds the text formatting bar and, on a saved search, its parameters. Every other
 * panel that used to sit here (note properties, attributes, paths, similar notes, the note map,
 * note info) is gone, and so are the tabs that led to them.
 */
export const RIBBON_TAB_DEFINITIONS: TabConfiguration[] = [
    {
        title: t("classic_editor_toolbar.title"),
        icon: "bx bx-text",
        show: showFormattingToolbar,
        content: FormattingToolbar,
        activate: true,
        stayInDom: true
    },
    {
        title: t("search_definition.search_parameters"),
        icon: "bx bx-search",
        content: SearchDefinitionTab,
        activate: true,
        show: ({ note }) => note?.type === "search"
    }
];
