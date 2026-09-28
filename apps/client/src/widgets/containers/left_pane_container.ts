import FlexContainer from "./flex_container.js";
import type Component from "../../components/component.js";

/** The note tree's column. It is always shown: nothing hides it and its width cannot reach zero. */
export default class LeftPaneContainer extends FlexContainer<Component> {
    constructor() {
        super("column");

        this.id("left-pane");
        this.css("height", "100%");
        this.collapsible();
    }
}
