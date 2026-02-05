# IBM Aspera TypeScript SDK

This JavaScript SDK enables web applications to utilize Aspera file-transfer capabilities via the IBM Aspera App for Desktop.

## Development

### Prerequisites

* Install [Node.js 18](https://nodejs.org/en/download/)
  - If you are on macOS, we recommend installing Node.js via a package manager such as [nvm](https://github.com/nvm-sh/nvm).
* Git

### Build

```shell
$ git clone https://github.com/IBM/aspera-sdk-js.git
$ cd aspera-sdk-js
$ npm install
$ npm run build
```

### Testing

To run the test app:
```shell
$ npm run dev
```

To run the unit tests:
```shell
$ npm run test
```

### Documentation

```shell
$ npm run docs
```

### Releasing

Releases are handled automatically via GitHub Actions. The process works as follows:

1. **Version bumping is automatic** - When you merge a PR to `main`, the `version.yml` workflow analyzes your commit message and bumps the version:
   - `feat: ...` → minor bump (0.4.3 → 0.5.0)
   - `fix: ...` or other → patch bump (0.4.3 → 0.4.4)
   - `breaking change: ...` → major bump (0.4.3 → 1.0.0)

2. **To publish a release**, run the release script after merging:
   ```shell
   $ ./scripts/release.sh
   ```
