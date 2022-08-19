# Change Log (@egomobile/swagger-proxy)

## 0.6.0

- [ISetupSwaggerProxyOptions interface](https://egomobile.github.io/node-swagger-proxy/interfaces/ISetupSwaggerProxyOptions.html) now supports `false` as value in [cache prop](https://egomobile.github.io/node-swagger-proxy/interfaces/ISetupSwaggerProxyOptions.html#cache) to indicate, to use no cache ... s. [PR 1](https://github.com/egomobile/node-swagger-proxy/issues/1)
- `npm update`s
- update peer dependency of [@egomobile/http-server](https://github.com/egomobile/node-http-server) to latest `^0.39.0`

## 0.5.0

- fix [setupSwaggerProxy() function](https://egomobile.github.io/node-swagger-proxy/modules.html#setupSwaggerProxy)
- **BREAKING CHANGE:** remove `defaultPath` from [ISetupSwaggerProxyOptions interface](https://egomobile.github.io/node-swagger-proxy/interfaces/ISetupSwaggerProxyOptions.html)

## 0.4.0

- add `defaultPath` to [ISetupSwaggerProxyOptions interface](https://egomobile.github.io/node-swagger-proxy/interfaces/ISetupSwaggerProxyOptions.html)

## 0.3.1

- remove internal constants

## 0.2.0

- use [mrmime](https://www.npmjs.com/package/mrmime) for mime type lookups now

## 0.1.0

- initial release
