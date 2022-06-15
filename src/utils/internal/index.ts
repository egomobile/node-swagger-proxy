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

import { HttpPathValidator, ParseError } from "@egomobile/http-server";

import yaml from "js-yaml";
import merge from "merge";
import type { OpenAPIV3 } from "openapi-types";
import path from "path";
import semver from "semver";
import { URL } from "url";
import { SwaggerBaseDocument, SwaggerSourceErrorHandler, SwaggerSourceFetcher, SwaggerSourceValue } from "../../types";
import type { Nil, Nilable } from "../../types/internal";
import { download } from "./download";

export interface ICreateSwaggerDocumentBuilderOptions {
    baseDocument: SwaggerBaseDocument;
    onSourceError: Nilable<SwaggerSourceErrorHandler>;
    sourceFetchers: SwaggerSourceFetcher[];
    version: string;
}

export function asAsync<TFunc extends Function = Function>(func: Function): TFunc {
    if (func.constructor.name === "AsyncFunction") {
        return func as TFunc;
    }

    return (async function (...args: any[]) {
        return func(...args);
    }) as any;
}

export function clone<T extends any = any>(val: any): T {
    if (!val) {
        return val;
    }

    return JSON.parse(
        JSON.stringify(val)
    );
}

export function createSwaggerDocumentBuilder(options: ICreateSwaggerDocumentBuilderOptions) {
    return async (): Promise<OpenAPIV3.Document> => {
        const baseDocument = options.baseDocument;
        const sourceFetchers = [...options.sourceFetchers];

        let components: OpenAPIV3.ComponentsObject = {};
        let paths: OpenAPIV3.PathsObject<{}, {}> = {};

        for (let i = 0; i < sourceFetchers.length; i++) {
            const fetchDocument = sourceFetchers[i];

            try {
                const downloadedDocument = await fetchDocument({
                    "index": i
                });

                if (typeof downloadedDocument !== "object") {
                    throw TypeError("Downloaded Swagger document must be ob type object");
                }

                throwIfInvalidOpenAPIVersion(
                    downloadedDocument.openapi.trim()
                );

                // merge them
                if (typeof downloadedDocument.components === "object") {
                    components = mergeObjects(components, downloadedDocument.components);
                }
                if (typeof downloadedDocument.paths === "object") {
                    paths = mergeObjects(paths, downloadedDocument.paths);
                }
            }
            catch (ex) {
                options.onSourceError?.({
                    "error": ex,
                    "index": i
                });
            }
        }

        return clone({
            "openapi": options.version,
            ...clone<SwaggerBaseDocument>(baseDocument),
            paths,
            components
        });
    };
}

export function createSwaggerPathValidator(basePath: Nilable<string>): HttpPathValidator {
    basePath = getSwaggerDocsBasePath(basePath);
    const basePathWithSuffix = basePath + (basePath.endsWith("/") ? "" : "/");

    return (request) => {
        return request.url === basePath ||
            !!request.url?.startsWith(basePathWithSuffix);
    };
}



export function getSwaggerDocsBasePath(basePath: Nilable<string>): string {
    if (isNil(basePath)) {
        basePath = "";
    }

    basePath = basePath.trim();

    if (basePath === "") {
        return "/swagger";
    }

    return normalizeRouterPath(basePath);
}

export function isNil(val: unknown): val is Nil {
    return typeof val === "undefined" || val === null;
}

export function mergeObjects<T extends any = any>(obj1: any, obj2: any): T {
    return {
        ...merge.recursive((obj1 ?? {}), (obj2 ?? {}))
    };
}

export function normalizeRouterPath(p: Nilable<string>): string {
    if (!p?.length) {
        p = "";
    }

    p = p.split(path.sep)
        .map(x => {
            return x.trim();
        })
        .filter(x => {
            return x !== "";
        })
        .join("/")
        .trim();

    while (p.endsWith("/")) {
        p = p.substring(0, p.length - 1).trim();
    }
    while (p.startsWith("/")) {
        p = p.substring(1).trim();
    }

    if (!p.startsWith("/")) {
        p = "/" + p.trim();
    }

    return p;
}

export function readStream(stream: NodeJS.ReadableStream) {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.once("error", (ex) => {
            reject(ex);
        });

        stream.on("data", (chunk) => {
            chunks.push(Buffer.from(chunk));
        });

        stream.once("end", () => {
            resolve(Buffer.concat(chunks));

            chunks.length = 0;
        });
    });
}

export function throwIfInvalidOpenAPIVersion(version: string) {
    if (!semver.valid(version)) {
        throw new TypeError("Invalid value in openapi property of downloaded document");
    }

    if (semver.lt(version, "3.0.0") || semver.gte(version, "3.1.0")) {
        throw new TypeError(`Not supported version ${version} in openapi property of downloaded document`);
    }
}

export function tryParseDocument(url: URL, data: Buffer, contentType: Nilable<string>): OpenAPIV3.Document {
    contentType = contentType?.toLowerCase().trim() ?? "";

    const fromJSON = () => {
        return JSON.parse(data.toString("utf8")) as OpenAPIV3.Document;
    };
    const fromYAML = () => {
        return yaml.load(data.toString("utf8")) as OpenAPIV3.Document;
    };

    // first try by Content-Type header
    try {
        if (contentType.includes("json")) {
            return fromJSON();
        }
        if (contentType.includes("yaml")) {
            return fromYAML();
        }
    }
    catch { }

    // then by file extension in path
    try {
        const ext = path.extname(url.pathname?.trim() ?? "");

        if (ext.endsWith(".json")) {
            return fromJSON();
        }
        if (ext.endsWith(".yaml") || ext.endsWith(".yml")) {
            return fromYAML();
        }
    }
    catch { }

    // last but not least: trial and error ...

    /// ... first JSON
    try {
        return fromJSON();
    }
    catch { }

    /// ... the YAML
    try {
        return fromYAML();
    }
    catch { }

    // nothing seem to help => throw ParseError
    throw new ParseError(new Error("Cannot parse document"));
}

export function toSourceFetcherSafe(value: SwaggerSourceValue): SwaggerSourceFetcher {
    let fetcher: Nilable<SwaggerSourceFetcher>;

    if (typeof value === "function") {
        // use custom function

        fetcher = value;
    }
    else if (
        typeof value === "string" ||
        value instanceof URL ||
        typeof value === "object"
    ) {
        // download via URL

        let downloadUrl: string;
        if (typeof value === "string" || value instanceof URL) {
            downloadUrl = `${value}`;
        }
        else {
            downloadUrl = value.url;
        }

        if (typeof downloadUrl !== "string") {
            throw new TypeError("url must be of type string");
        }

        fetcher = async () => {
            const { contentType, data, url } = await download(downloadUrl);

            return tryParseDocument(url, data, contentType);
        };
    }

    if (typeof fetcher !== "function") {
        throw new TypeError("value must be of type string, function or URL");
    }

    return asAsync(fetcher);
}

export * from "./download";
