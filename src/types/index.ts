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

import type { OpenAPIV3 } from "openapi-types";
import type { URL } from "url";

/**
 * A source with a Swagger / OpenAPI document.
 */
export interface ISwaggerSource {
    /**
     * The URL.
     */
    url: string;
}

/**
 * Context for a `SwaggerSourceErrorHandler` call.
 */
export interface ISwaggerSourceErrorHandlerContext {
    /**
     * The occurred error.
     */
    error: any;
    /**
     * The zero-based index of the underlying source.
     */
    index: number;
}

/**
 * Context for a `SwaggerSourceFetcher` call.
 */
export interface ISwaggerSourceFetcherContext {
    /**
     * The zero-based index of the underlying source.
     */
    index: number;
}

/**
 * A base Swagger document.
 */
export type SwaggerBaseDocument = Omit<OpenAPIV3.Document, "components" | "openapi" | "paths">;

/**
 * A function, which handles an error, that happens while a download
 * of Swagger source.
 */
export type SwaggerSourceErrorHandler = (context: ISwaggerSourceErrorHandlerContext) => any;

/**
 * A function, which fetches a swagger source.
 */
export type SwaggerSourceFetcher = (context: ISwaggerSourceFetcherContext) => OpenAPIV3.Document | PromiseLike<OpenAPIV3.Document>;

/**
 * A possible value for a `source` prop of an `ISwaggerSourceErrorHandlerContext` instance.
 */
export type SwaggerSourceValue = ISwaggerSource | string | URL;
