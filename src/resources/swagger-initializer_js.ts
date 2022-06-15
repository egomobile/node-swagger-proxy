/* eslint-disable unicorn/filename-case */

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

import type { Nilable } from "../types/internal";
import { isNil } from "../utils/internal";

export interface ISwaggerInitializerJSOptions {
    onloadJS: Nilable<string>;
    resetOnloadJS: Nilable<boolean>;
}

export default (options: ISwaggerInitializerJSOptions) => {
    const onloadJS = options.onloadJS;
    if (!isNil(onloadJS)) {
        if (typeof onloadJS !== "string") {
            throw new TypeError("options.onloadJS must be of type string");
        }
    }

    const shouldResetOnloadJS = !!options.resetOnloadJS;
    if (shouldResetOnloadJS) {
        return `
window.onload = function() {
  //<editor-fold desc="Changeable Configuration Block">

${onloadJS ?? ""}

  //</editor-fold>
};
`;
    }
    else {
        return `
window.onload = function() {
  //<editor-fold desc="Changeable Configuration Block">

  // the following lines will be replaced by docker/configurator, when it runs in a docker-container
  window.ui = SwaggerUIBundle({
    url: "./json",
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  });

  if (typeof document.querySelector === 'function') {
    var downloadUrlWrapper = document.querySelector('form.download-url-wrapper');
    if (downloadUrlWrapper) {
      downloadUrlWrapper.style.visibility = 'hidden';
    }
  }

${onloadJS ?? ""}

  //</editor-fold>
};
`;
    }
};
