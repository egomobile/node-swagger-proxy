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

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type { SwaggerSourceFetcher } from "../types";
import { tryParseDocument } from "../utils/internal";

const { readFile } = fs.promises;

/**
 * Creates a Swagger document fetcher for a local file.
 *
 * @example
 * ```
 * import createServer from "@egomobile/http-server"
 * import { setupSwaggerProxy, sourceFromFile } from "@egomobile/swagger-proxy"
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
 *       sourceFromFile('/path/to/local/file1.json'),
 *       sourceFromFile('/path/to/local/file2.yaml'),
 *     ]
 *   })
 *
 *   await app.listen(8080)
 * }
 *
 * main().catch(console.error)
 * ```
 *
 * @param {string} file The path to the file.
 *
 * @returns {SwaggerSourceFetcher} The new fetcher.
 */
export function sourceFromFile(file: string): SwaggerSourceFetcher {
    if (typeof file !== "string") {
        throw new TypeError("file must be of type string");
    }

    if (!path.isAbsolute(file)) {
        file = path.join(process.cwd(), file);
    }

    const url = pathToFileURL(file);

    return async () => {
        const data = await readFile(file);

        return tryParseDocument(url, data, null);
    };
}
