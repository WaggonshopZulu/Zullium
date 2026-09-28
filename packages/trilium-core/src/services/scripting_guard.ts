import config from "./config.js";

export function assertSqlConsoleEnabled(): void {
    if (config.Security.sqlConsoleEnabled) {
        return;
    }
    throw new Error(
        "SQL console is disabled. Set [Security] sqlConsoleEnabled=true in config.ini to enable."
    );
}
