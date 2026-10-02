import "./top_bar_brand.css";

import { useEffect, useState } from "preact/hooks";

/** Formats the computer's local time as 24-hour HH:MM:SS, the form the shift log's entries use. */
export function formatClock(now: Date) {
    return [ now.getHours(), now.getMinutes(), now.getSeconds() ]
        .map((part) => String(part).padStart(2, "0"))
        .join(":");
}

/**
 * The wordmark and a live clock at the right of the top bar. The clock re-reads the computer's time
 * on every tick instead of counting seconds, so it stays correct after the machine sleeps or its
 * clock is adjusted.
 */
export default function TopBarBrand() {
    const [ now, setNow ] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 250);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="top-bar-brand">
            <span className="top-bar-wordmark" aria-label="ZULU ONE - Security">
                <span className="top-bar-wordmark-name">Zulu One</span>
                <span className="top-bar-wordmark-divider" aria-hidden="true" />
                <span className="top-bar-wordmark-sub">Security</span>
            </span>
            <time className="top-bar-clock" dateTime={now.toISOString()}>{formatClock(now)}</time>
        </div>
    );
}
