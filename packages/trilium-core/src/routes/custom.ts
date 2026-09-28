import becca from "../becca/becca";
import type { Request, Response } from "../http_interface";
import { getLog } from "../services/log";
import { getSql } from "../services/sql/index";
import { normalizeCustomHandlerPattern, safeExtractMessageAndStackFromError } from "../services/utils/index";
import { downloadNoteInt } from "./helpers";

/**
 * The response a custom handler writes to: core's {@link Response}, which `downloadNoteInt` needs.
 * Express's `Response` and standalone's mock response both satisfy it.
 */
export type CustomRequestResponse = Response;

/**
 * Answers a `/custom/` request from the first `customResourceProvider` note whose pattern matches
 * `path`, and writes a 404 when none does.
 *
 * @param path the path below `/custom/`, without a leading slash.
 */
export function handleCustomRequest(
    path: string, req: Request, res: CustomRequestResponse
): unknown {
    const attributeIds = getSql().getColumn<string>(
        "SELECT attributeId FROM attributes WHERE isDeleted = 0 AND type = 'label' "
        + "AND name IN ('customResourceProvider')"
    );

    for (const attributeId of attributeIds) {
        const attr = becca.getAttribute(attributeId);

        if (!attr?.value.trim()) {
            continue;
        }

        const match = matchPath(path, attr.value, attr.attributeId);

        if (!match) {
            continue;
        }

        if (attr.name === "customResourceProvider") {
            downloadNoteInt(attr.noteId, res);
            return;
        } else {
            throw new Error(`Unrecognized attribute name '${attr.name}'`);
        }
    }

    const message = `No handler matched for custom '${path}' request.`;

    getLog().info(message);
    res.setHeader("Content-Type", "text/plain").status(404).send(message);
}

/**
 * Matches `path` against a handler's pattern, trying both the trailing-slash and no-trailing-slash
 * forms {@link normalizeCustomHandlerPattern} produces. A pattern that is not a valid regex is
 * logged and skipped, so one bad label cannot take the whole route down.
 */
function matchPath(path: string, pattern: string, attributeId: string): RegExpMatchArray | null {
    try {
        for (const candidate of normalizeCustomHandlerPattern(pattern)) {
            const match = path.match(new RegExp(`^${candidate}$`));

            if (match) {
                return match;
            }
        }
    } catch (e: unknown) {
        const [errMessage, errStack] = safeExtractMessageAndStackFromError(e);
        getLog().error(`Testing path for label '${attributeId}', regex '${pattern}' failed with error: ${errMessage}, stack: ${errStack}`);
    }

    return null;
}
