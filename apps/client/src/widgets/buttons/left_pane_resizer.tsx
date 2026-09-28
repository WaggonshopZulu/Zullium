import { useEffect } from "preact/hooks";

import resizer from "../../services/resizer";

/** Sets up the split between the note tree and the rest of the window. The tree cannot be hidden. */
export default function LeftPaneResizer() {
    useEffect(() => {
        resizer.setupLeftPaneResizer(true);
    }, []);

    return null;
}
