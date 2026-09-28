import "./i18n.css";

import { useMemo } from "preact/hooks";

import { getAvailableLocales } from "../../../services/i18n";
import { useTriliumOptionJson } from "../../react/hooks";
import CheckboxList from "./components/CheckboxList";

/**
 * The languages a note's content can be written in, used by the ribbon's Basic Properties tab to
 * set a note's content language (for spellcheck). The global UI language picker this used to sit
 * beside was removed for the guard build -- one fixed locale, set at build time.
 */
export function ContentLanguagesList() {
    const locales = useMemo(() => getAvailableLocales(), []);
    const [ languages, setLanguages ] = useTriliumOptionJson<string[]>("languages");

    return (
        <CheckboxList
            values={locales}
            keyProperty="id" titleProperty="name"
            currentValue={languages} onChange={setLanguages}
            columnWidth="300px"
        />
    );
}
