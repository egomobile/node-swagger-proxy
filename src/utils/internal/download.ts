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

import { ClientRequest as HttpClientRequest, IncomingMessage, request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { readStream } from ".";
import type { Optional } from "../../types/internal";

export interface IDownloadResult {
    contentType: Optional<string>;
    data: Buffer;
    url: URL;
}

const supportedProtocols = ["http:", "https:"];

export function download(rawUrl: string): Promise<IDownloadResult> {
    rawUrl = rawUrl.trim();
    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
        rawUrl = "https://" + rawUrl;
    }

    const url = new URL(rawUrl);

    if (!supportedProtocols.includes(url.protocol)) {
        throw new Error(`Only following protocols are supported: ${supportedProtocols.join(", ")}`);
    }

    return new Promise<IDownloadResult>((resolve, reject) => {
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

        let request: HttpClientRequest;

        if (url.protocol === "https:") {
            request = httpsRequest(url, onResponse);
        }
        else {
            request = httpRequest(url, onResponse);
        }

        request.end();
    });
}
