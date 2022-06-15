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
import { ClientRequest as HttpClientRequest, IncomingMessage, request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import yaml from "js-yaml";
import merge from "merge";
import type { OpenAPIV3 } from "openapi-types";
import path from "path";
import semver from "semver";
import { URL } from "url";
import { ISwaggerSource, SwaggerBaseDocument, SwaggerSourceErrorHandler } from "../types";
import type { Nil, Nilable, Optional } from "../types/internal";

export interface ICreateSwaggerDocumentBuilderOptions {
    baseDocument: SwaggerBaseDocument;
    onSourceError: Nilable<SwaggerSourceErrorHandler>;
    sources: ISwaggerSource[];
    version: string;
}

export interface IDownloadResult {
    contentType: Optional<string>;
    data: Buffer;
    url: URL;
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
        let components: OpenAPIV3.ComponentsObject = {};
        let paths: OpenAPIV3.PathsObject<{}, {}> = {};

        for (const source of options.sources) {
            try {
                const { contentType, data, url } = await download(source.url);

                const downloadedDocument = tryParseDocument(url, data, contentType);
                if (typeof downloadedDocument !== "object") {
                    continue;
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
                options?.onSourceError({
                    "error": ex,
                    source
                });
            }
        }

        return clone({
            "openapi": options.version,
            ...clone<SwaggerBaseDocument>(options.baseDocument),
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

export function download(rawUrl: string) {
    rawUrl = rawUrl.trim();
    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
        rawUrl = "https://" + rawUrl;
    }

    const url = new URL(rawUrl);

    return new Promise<IDownloadResult>((resolve, reject) => {
        let request: HttpClientRequest;

        const onResponse = async (response: IncomingMessage) => {
            try {
                if (response.statusCode! >= 200 && response.statusCode! < 300) {
                    const result: IDownloadResult = {
                        "data": await readStream(response),
                        "contentType": response.headers["content-type"]?.toLowerCase().trim() || undefined,
                        url
                    };

                    resolve(result);
                }
                else {
                    reject(new Error(`Unexpected response: ${response.statusCode}`));
                }
            }
            catch (ex) {
                reject(ex);
            }
        };

        if (url.protocol === "https:") {
            request = httpsRequest(url, onResponse);
        }
        else {
            // http:

            request = httpRequest(url, onResponse);
        }

        request.end();
    });
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
