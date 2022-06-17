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
import { sourcesFromFile } from "./sourcesFromFile";
import { sourcesFromUrl } from "./sourcesFromUrl";

/**
 * Creates a Swagger document fetcher for a local file.
 *
 * @example
 * ```
 * import createServer from "@egomobile/http-server"
 * import { setupSwaggerProxy, sourcesFromEnvVars } from "@egomobile/swagger-proxy"
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
 *       // setup environments like this:
 *       //
 *       // SWAGGER_SOURCE_1=https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.yaml
 *       // SWAGGER_SOURCE_2=https://petstore.swagger.io/v2/swagger.json
 *       // SWAGGER_SOURCE_3=/path/to/local/file.yaml
 *       ...sourcesFromEnvVars(),
 *     ]
 *   })
 *
 *   await app.listen(8080)
 * }
 *
 * main().catch(console.error)
 * ```
 *
 * @returns {SwaggerSourceValue[]} The sources.
 */
export function sourcesFromEnvVars(): SwaggerSourceValue[] {
    const sources: SwaggerSourceValue[] = [];

    Object.entries(process.env)
        .map((entry) => {
            return {
                "key": entry[0]?.toUpperCase().trim() ?? "",
                "value": entry[1]?.trim() ?? ""
            };
        })
        .filter((envVar) => {
            // SWAGGER_SOURCE_*
            return /^(SWAGGER_SOURCE_)([\d]+)$/.test(envVar.key) &&
                envVar.value !== "";
        }).forEach((envVar) => {
            if (envVar.value.includes("://")) {
                // URL

                sources.push(
                    ...sourcesFromUrl(envVar.value)
                );
            }
            else {
                // local file

                sources.push(
                    ...sourcesFromFile(envVar.value)
                );
            }
        });

    return sources;
}
