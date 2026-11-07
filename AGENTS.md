# Repository guidance

## Project structure

- `src/`: React UI, curriculum data, progress logic and browser voice client.
- `server/`: local Node.js HTTP service and Realtime session configuration.
- `public/assets/`: illustrations and visual assets.
- `tests/`: curriculum, static-hosting and mocked voice tests.
- `worker/` and `scripts/prepare-sites-build.mjs`: static-hosting build support.

## Development

Use Node.js 22+ and install dependencies with `npm ci`. Keep changes focused and update the relevant documentation when behavior or setup changes.

For UI changes, check desktop and narrow layouts, keyboard navigation, course selection, retry feedback, pause, restart and completion. Do not treat responsive viewport checks as physical-device testing.

Maintain the build outputs expected by the hosting tests: `dist/client/index.html`, `dist/server/index.js` and `dist/.openai/hosting.json`. Hosting configuration must remain free of credentials and account-specific identifiers.

## Verification

```sh
npm run build
npm run test:curriculum
npm run test:sites
npm run test:voice
npm audit --audit-level=moderate
```

When changing container packaging, also run:

```sh
docker compose -f compose.voice.yaml config --quiet
sh scripts/verify-container.sh
```

Record which checks ran and their results in the change description. Offline voice tests use mocks; they do not establish real microphone, provider or teaching behavior.

## Safety constraints

Voice is disabled by default and supports adult tests with fictitious content only. Preserve the local-only network binding, server-side key handling, input validation, disconnect cleanup and manual course-completion confirmation.

Do not commit secrets, real `.env` files, recordings or personal data. Do not enable child use, public network access or paid provider calls as part of ordinary automated tests. Changes to these boundaries require a separate design and safety review.
