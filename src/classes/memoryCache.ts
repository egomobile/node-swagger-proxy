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

/**
 * A simple cache, which is storing its data in memory.
 */
export class MemoryCache implements ICache {
    private _data: Record<string, any> = {};

    /**
     * @inheritdoc
     */
    public get<T extends any = any, TDefault extends any = T>(
        key: any, defaultValue?: TDefault
    ): T | TDefault | undefined {
        const value = this._data[this.getStringKey(key)];

        if (typeof value !== "undefined") {
            return value;
        }
        else {
            return defaultValue;
        }
    }

    /**
     * @inheritdoc
     */
    public set(key: any, value: any): boolean {
        this._data[this.getStringKey(key)] = value;

        return true;
    }

    private getStringKey(key: any): string {
        return String(key ?? "");
    }
}
