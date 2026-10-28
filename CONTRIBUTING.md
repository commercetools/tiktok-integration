# Contributing

Contributions are welcome. This is a commercetools-labs project: it is provided as is and is not supported by
commercetools (see [SUPPORT.md](SUPPORT.md)), so reviews happen when maintainers have time.

## Ground rules

- By contributing you agree your work is released under the [MIT License](LICENSE).
- Never commit secrets, tokens, `.env` files, Terraform state or `*.tfvars`. Never put real shop ids, project keys or customer data in code, tests or issues.
- Keep changes focused. One concern per pull request.

## Layout

```
connect.yaml            the Connect install contract (all four applications)
service/ event/ refresh-token-job/   backend applications, each with its own package.json
mc-app/                 Merchant Center custom application (self-contained; must not import shared/)
shared/                 common module the three backends depend on (see below)
terraform/              custom types, channel and store
docs/                   setup, webhooks, token storage
```

`shared/` is a Connect [common module](https://docs.commercetools.com/connect/common-modules): a package named `tiktok-shared` that `service`, `event` and `refresh-token-job` depend on as `"tiktok-shared": "link:../shared"` and import as `tiktok-shared/dist/src/<module>` (the SDK as `tiktok-shared/dist/tiktok-sdk`). The module's own code lives in `shared/src`, because Connect's static analysis scans a common module's `src` folder and fails when it is missing; the vendored SDK stays outside `src`. Their `build` script builds it first (`yarn --cwd ../shared install && yarn --cwd ../shared run build`), so after editing `shared/` just run the app's `yarn build` or `yarn test`. Its own tests run with `cd shared && yarn test`. Dependencies that shared code imports belong in `shared/package.json`. `shared/tiktok-sdk` is TikTok's generated Node.js SDK, which you download yourself (see [docs/setup.md](docs/setup.md#1-add-the-tiktok-nodejs-sdk)); do not edit it by hand.

## Working on a change

```console
cd service            # or event, refresh-token-job, mc-app
yarn install
yarn tsc --noEmit
yarn test
yarn build
```

Before you open a pull request, make sure that:

- typecheck, tests and build pass in every app you touched (CI runs them for all four);
- new logic has tests; webhook, signature, encryption and session-verification changes especially;
- there is no `console.log` (use the logger), no commented-out code, and no `any` where a type is available;
- a new configuration key is added to `connect.yaml`, to the `.env.example` of the apps that read it, and to the README tables;
- a new API client scope is justified in a comment in `connect.yaml` and in the README scope table;
- `terraform validate` passes if you touched `terraform/`.

## Reporting bugs

Open an issue with steps to reproduce, expected and actual behavior, and logs with secrets, tokens and shop ids removed.
