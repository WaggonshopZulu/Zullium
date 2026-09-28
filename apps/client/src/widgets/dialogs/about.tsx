import "./about.css";

import { APP_NAME, type AppInfo } from "@triliumnext/commons";
import type { ComponentChildren } from "preact";
import { useCallback, useRef, useState } from "preact/hooks";
import { Trans } from "react-i18next";

import { t } from "../../services/i18n.js";
import server from "../../services/server.js";
import { formatDateTime } from "../../utils/formatters.js";
import DirectoryLink from "../react/DirectoryLink.js";
import { useTriliumEvent } from "../react/hooks.jsx";
import Modal from "../react/Modal.js";
import { PropertySheet, PropertySheetItem } from "../react/PropertySheet.js";

export default function AboutDialog() {
    const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
    const [isShown, setIsShown] = useState(false);

    const hasLoaded = useRef(false);

    const onLoad = useCallback(async () => {
        if (!hasLoaded.current) {
            const info = await server.get<AppInfo>("app-info");
            setAppInfo(info);
            hasLoaded.current = true;
        }
        setIsShown(true);
    }, []);

    useTriliumEvent("openAboutDialog", onLoad);

    return (
        <Modal
            className="about-dialog"
            size="md"
            isFullPageOnMobile
            show={isShown}
            onHidden={() => setIsShown(false)}
        >
            <div className="about-dialog-content">

                <div className="icon" />
                <h2>{APP_NAME}</h2>

                <PropertySheet className="about-dialog-property-sheet">
                    <PropertySheetItem label={t("about.version_label")}>
                        {t("about.version", {
                            appVersion: appInfo?.appVersion,
                            dbVersion: appInfo?.dbVersion,
                            syncVersion: appInfo?.syncVersion
                        })}
                        <div className="build-info">
                            <Trans
                                i18nKey="about.build_info"
                                values={{
                                    buildDate: appInfo?.buildDate ? formatDateTime(appInfo.buildDate) : "",
                                    buildRevision: appInfo?.buildRevision?.substring(0, 7) ?? ""
                                }}
                            />
                        </div>
                    </PropertySheetItem>

                    {appInfo?.dataDirectory && (
                        <PropertySheetItem label={t("about.data_directory")}>
                            <div style={{wordBreak: "break-all"}}>
                                <DirectoryLink directory={appInfo.dataDirectory} />
                            </div>
                        </PropertySheetItem>
                    )}
                </PropertySheet>

                <p className="about-dialog-attribution">{t("about.based_on")}</p>
            </div>

            <footer>
                <FooterLink
                    text={t("about.license")}
                    url="https://www.gnu.org/licenses/agpl-3.0.html"
                    tooltip={t("about.license_tooltip")}>

                    {/* https://pictogrammers.com/library/mdi/icon/scale-balance/ */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,3C10.73,3 9.6,3.8 9.18,5H3V7H4.95L2,14C1.53,16 3,17 5.5,17C8,17 9.56,16 9,14L6.05,7H9.17C9.5,7.85 10.15,8.5 11,8.83V20H2V22H22V20H13V8.82C13.85,8.5 14.5,7.85 14.82,7H17.95L15,14C14.53,16 16,17 18.5,17C21,17 22.56,16 22,14L19.05,7H21V5H14.83C14.4,3.8 13.27,3 12,3M12,5A1,1 0 0,1 13,6A1,1 0 0,1 12,7A1,1 0 0,1 11,6A1,1 0 0,1 12,5M5.5,10.25L7,14H4L5.5,10.25M18.5,10.25L20,14H17L18.5,10.25Z" /></svg>
                </FooterLink>
            </footer>
        </Modal>
    );
}

function FooterLink({children, text, url, tooltip}: {children: ComponentChildren, text: string, url: string, tooltip: string}) {
    return <a href={url} title={tooltip} target="_blank" rel="noopener noreferrer" draggable={false}>
        {children}
        {text}
    </a>;
}
