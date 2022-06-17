[![npm](https://img.shields.io/npm/v/@egomobile/swagger-proxy.svg)](https://www.npmjs.com/package/@egomobile/swagger-proxy)
[![last build](https://img.shields.io/github/workflow/status/egomobile/node-swagger-proxy/Publish)](https://github.com/egomobile/node-swagger-proxy/actions?query=workflow%3APublish)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/egomobile/node-swagger-proxy/pulls)

# @egomobile/swagger-proxy

> Extension for [@egomobile/http-server](https://github.com/egomobile/node-http-server), which connects to multiply [Swagger / OpenAPI](https://swagger.io/docs/specification/about/) instances and merge their documents to one.

## Install

Execute the following command from your project folder, where your
`package.json` file is stored:

```bash
npm install --save @egomobile/swagger-proxy
```

## Usage

```typescript
import createServer from "@egomobile/http-server";
import { setupSwaggerProxy } from "@egomobile/swagger-proxy";

async function main() {
  const app = createServer();

  setupSwaggerProxy(app, {
    baseDocument: {
      info: {
        title: "My merged API",
        version: "1.0.0",
      },
    },

    sources: [
      {
        url: "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/link-example.json",
      },
      {
        url: "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/callback-example.yaml",
      },
      {
        url: "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.yaml",
      },
    ],
  });

  await app.listen(8080);

  const baseURL = `http://localhost:${app.port}/swagger`;

  console.log("You should now be able to access documentation at:");
  console.log(`- ${baseURL}`);

  console.log();

  console.log("You can download documentation as files from:");
  console.log(`- JSON: ${baseURL}/json`);
  console.log(`- YAML: ${baseURL}/yaml`);
}

main().catch(console.error);
```

## Documentation

The API documentation can be found
[here](https://egomobile.github.io/node-swagger-proxy/).
