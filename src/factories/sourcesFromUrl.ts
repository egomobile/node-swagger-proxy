// This file is part of the @egomobile/swagger-proxy distribution.
// Copyright (c) Next.e.GO Mobile SE, Aachen, Germany (https://e-go-mobile.com/)
//
// @egomobile/swagger-proxy is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as
// published by the Free Software Foundation, version 3.
//
// @egomobile/swagger-proxy is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

import type { SwaggerSourceValue } from "../types";
import { download, tryParseDocument } from "../utils/internal";

/**
 * Creates Swagger document sources from an URL.
 *
 * @example
 * ```
 * import createServer from "@egomobile/http-server"
 * import { setupSwaggerProxy, sourcesFromUrl } from "@egomobile/swagger-proxy"
 *
 * async function main() {
 *   const app = createServer()
 *
 *   setupSwaggerProxy(app, {
 *     "baseDocument": {
 *       "info": {
 *         "title": "My merged API",
 *         "version": "1.0.0"
 *       }
 *     },
 *
 *     "sources": [
 *       ...sourcesFromUrl("https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.yaml"),
 *     ]
 *   })
 *
 *   await app.listen(8080)
 * }
 *
 * main().catch(console.error)
 * ```
 *
 * @param {string} rawUrl The raw URL.
 *
 * @returns {SwaggerSourceValue[]} The sources.
 */
export function sourcesFromUrl(rawUrl: string): SwaggerSourceValue[] {
    if (typeof rawUrl !== "string") {
        throw new TypeError("rawUrl must be of type string");
    }

    return [
        async () => {
            const { contentType, data, url } = await download(rawUrl);

            return tryParseDocument(url, data, contentType);
        }
    ];
}
