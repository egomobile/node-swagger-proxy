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

import type { HttpMiddleware, IHttpServer } from "@egomobile/http-server";
import fs from "fs";
import yaml from "js-yaml";
import mrmime from "mrmime";
import path from "path";
import { MemoryCache } from "./classes";
import { AsyncCacheWrapper } from "./classes/asyncCacheWrapper";
import swaggerInitializerJs from "./resources/swagger-initializer_js";
import { ICache, SwaggerBaseDocument, SwaggerDocumentUpdater, SwaggerSourceErrorHandler, SwaggerSourceValue } from "./types";
import { Nilable } from "./types/internal";
import { createSwaggerDocumentBuilder, createSwaggerPathValidator, ICreateSwaggerDocumentBuilderOptions, isNil, normalizeRouterPath, throwIfInvalidOpenAPIVersion, toSourceFetcherSafe } from "./utils/internal";

/**
 * Options for `setupSwaggerProxy()` function.
 */
export interface ISetupSwaggerProxyOptions {
    /**
     * The base document.
     */
    baseDocument: SwaggerBaseDocument;
    /**
     * The custom base path.
     */
    basePath?: Nilable<string>;
    /**
     * The custom cache provider to use.
     */
    cache?: Nilable<ICache>;
    /**
     * The custom key in the cache, which is used to store
     * downloaded Swagger documents as array.
     *
     * @default "downloaded-swagger-documents"
     */
    cacheKey?: Nilable<any>;
    /**
     * The additional JavaScript code for the end of the
     * `window.onload` function of the `swagger-initializer.js` file.
     */
    onloadJS?: Nilable<string>;
    /**
     * Is invoked, when downloading a Swagger document from a source.
     */
    onSourceError?: Nilable<SwaggerSourceErrorHandler>;
    /**
     * An optional function, which updates a (downloaded) Swagger document.
     */
    onUpdateDocument?: Nilable<SwaggerDocumentUpdater>;
    /**
     * Reset the code of `window.onload` function of the `swagger-initializer.js` file
     * or not.
     *
     * @default false
     */
    resetOnloadJS?: Nilable<boolean>;
    /**
     * One or more source.
     */
    sources: SwaggerSourceValue[];
    /**
     * One or more custom middlewares to use.
     */
    use?: Nilable<HttpMiddleware[]>;
    /**
     * OpenAPI version.
     *
     * @default "3.0.3"
     */
    version?: Nilable<string>;
}

const pathToSwaggerUi: string = require("swagger-ui-dist").absolutePath();

const indexHtmlFilePath = path.join(pathToSwaggerUi, "index.html");
const swaggerInitializerJSFilePath = path.join(pathToSwaggerUi, "swagger-initializer.js");

const { readFile, stat } = fs.promises;

/**
 * Sets up a `IHttpServer` instance for a Swagger proxy.
 *
 * @example
 * ```
 * import createServer from "@egomobile/http-server"
 * import { setupSwaggerProxy } from "@egomobile/swagger-proxy"
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
 *       {
 *         "url": "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/link-example.json"
 *       },
 *       {
 *         "url": "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/callback-example.yaml"
 *       },
 *       {
 *         "url": "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.yaml"
 *       }
 *     ]
 *   })
 *
 *   await app.listen(8080)
 *
 *   const baseURL = `http://localhost:${app.port}/swagger`
 *
 *   console.log("You should now be able to access documentation at:")
 *   console.log(`- ${baseURL}`)
 *
 *   console.log()
 *
 *   console.log("You can download documentation as files from:")
 *   console.log(`- JSON: ${baseURL}/json`)
 *   console.log(`- YAML: ${baseURL}/yaml`)
 * }
 *
 * main().catch(console.error)
 * ```
 *
 * @param {IHttpServer} server The server instance.
 * @param {ISetupSwaggerProxyOptions} options The options.
 */
export function setupSwaggerProxy(server: IHttpServer, options: ISetupSwaggerProxyOptions) {
    if (server.isEgoHttpServer !== true) {
        throw new TypeError("server seems to be no IHttpServer instance");
    }

    if (typeof options !== "object") {
        throw new TypeError("options must be of type object");
    }

    if (!Array.isArray(options.sources)) {
        throw new TypeError("options.sources must be of type Array");
    }

    if (!isNil(options.onSourceError)) {
        if (typeof options.onSourceError !== "function") {
            throw new TypeError("options.onSourceError must be of type function");
        }
    }

    if (!isNil(options.onUpdateDocument)) {
        if (typeof options.onUpdateDocument !== "function") {
            throw new TypeError("options.onUpdateDocument must be of type function");
        }
    }

    const defaultCache: ICache = new MemoryCache();

    const swaggerInitializerJSContent = Buffer.from(swaggerInitializerJs({
        "onloadJS": options.onloadJS,
        "resetOnloadJS": options.resetOnloadJS
    }), "utf8");

    const swaggerDocBuilderOptions: ICreateSwaggerDocumentBuilderOptions = {
        "baseDocument": undefined!,
        "cache": undefined!,
        "cacheKey": undefined!,
        "onSourceError": options.onSourceError,
        "onUpdateDocument": options.onUpdateDocument,
        "sourceFetchers": undefined!,
        "version": undefined!
    };

    // make these props of `swaggerDocBuilderOptions` dynamic
    Object.defineProperties(swaggerDocBuilderOptions, {
        // swaggerDocBuilderOptions.baseDocument
        "baseDocument": {
            "get": () => {
                return options.baseDocument;
            }
        },

        // swaggerDocBuilderOptions.cache
        "cache": {
            "get": () => {
                return new AsyncCacheWrapper(options.cache ?? defaultCache);
            }
        },

        // swaggerDocBuilderOptions.cacheKey
        "cacheKey": {
            "get": () => {
                return options.cacheKey ?? "downloaded-swagger-documents";
            }
        },

        // swaggerDocBuilderOptions.sourceFetchers
        "sourceFetchers": {
            "get": () => {
                return options.sources.map((source) => {
                    return toSourceFetcherSafe(source);
                });
            }
        },

        // swaggerDocBuilderOptions.version
        "version": {
            "get": () => {
                let version = (options.version ?? "").trim();
                if (version === "") {
                    version = "3.0.3";
                }

                throwIfInvalidOpenAPIVersion(version);

                return version;
            }
        }
    });

    const buildDocument = createSwaggerDocumentBuilder(swaggerDocBuilderOptions);

    server.get(
        createSwaggerPathValidator(options.basePath),
        options.use ?? [],
        async (request, response) => {
            const fileOrDir = normalizeRouterPath(request.url);

            // return as JSON?
            if (fileOrDir.endsWith("/json") || fileOrDir.endsWith("/json/")) {
                const document = await buildDocument();
                const documentJson = Buffer.from(JSON.stringify(document), "utf8");

                response.writeHead(200, {
                    "Content-Disposition": "attachment; filename=\"api-openapi3.json",
                    "Content-Type": "application/json; charset=UTF-8",
                    "Content-Length": String(documentJson.length)
                });
                response.write(documentJson);

                return;
            }

            // return as YAML?
            if (fileOrDir.endsWith("/yaml") || fileOrDir.endsWith("/yaml/")) {
                const document = await buildDocument();
                const documentYaml = Buffer.from(yaml.dump(document), "utf8");

                response.writeHead(200, {
                    "Content-Disposition": "attachment; filename=\"api-openapi3.yaml",
                    "Content-Type": "application/x-yaml; charset=UTF-8",
                    "Content-Length": String(documentYaml.length)
                });
                response.write(documentYaml);

                return;
            }

            let fullPath = path.join(pathToSwaggerUi, fileOrDir);

            if (
                fullPath.startsWith(pathToSwaggerUi + path.sep) ||
                fullPath === pathToSwaggerUi
            ) {
                let existingFile: string | false = false;

                if (fs.existsSync(fullPath)) {
                    const fileOrDirStats = await stat(fullPath);
                    if (fileOrDirStats.isDirectory()) {
                        fullPath = indexHtmlFilePath;

                        if (fs.existsSync(fullPath)) {
                            existingFile = fullPath;
                        }
                    }
                    else {
                        existingFile = fullPath;
                    }
                }

                if (fullPath === swaggerInitializerJSFilePath) { // swagger-initializer.js
                    response.writeHead(200, {
                        "Content-Type": "text/javascript; charset=UTF-8",
                        "Content-Length": String(swaggerInitializerJSContent.length)
                    });
                    response.write(swaggerInitializerJSContent);

                    return;
                }

                if (existingFile) {  // does file exist?
                    const contentType = mrmime.lookup(path.extname(existingFile))
                        || "application/octet-stream";
                    const content = await readFile(existingFile);

                    response.writeHead(200, {
                        "Content-Type": contentType,
                        "Content-Length": String(content.length)
                    });
                    response.write(content);

                    return;
                }
            }

            if (!response.headersSent) {
                response.writeHead(404, {
                    "Content-Length": "0"
                });
            }
        }
    );
}

export * from "./factories";
export * from "./types";

