import "./sidebar_brand_header.css";

import { APP_NAME } from "@triliumnext/commons";

import crest from "../assets/brand-crest.png";

/**
 * The crest and app name shown above the note tree — the sidebar's own identity, distinct from the
 * launch bar rail's `GlobalMenu` button. The crest is decorative: `APP_NAME` beside it already carries
 * the same information, so it's hidden from screen readers rather than announced twice.
 */
export default function SidebarBrandHeader() {
    return (
        <div className="sidebar-brand-header">
            <img className="sidebar-brand-header-crest" src={crest} alt="" aria-hidden="true" />
            <span className="sidebar-brand-header-name">{APP_NAME}</span>
        </div>
    );
}
