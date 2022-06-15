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

import type { ICache } from "../types";

export class AsyncCacheWrapper implements ICache {
    public constructor(
        public readonly cache: ICache
    ) { }

    public async get<T extends any = any, TDefault extends any = T>(
        key: any, defaultValue?: TDefault
    ): Promise<T | TDefault | undefined> {
        try {
            return await Promise.resolve(this.cache.get(key, defaultValue));
        }
        catch {
            return defaultValue;
        }
    }

    public async set(key: any, value: any): Promise<boolean> {
        try {
            return await Promise.resolve(this.cache.set(key, value));
        }
        catch {
            return false;
        }
    }
}
