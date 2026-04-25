# Repository Guidelines

## Project Structure & Module Organization

This is a WXT browser extension built with Vue 3, TypeScript, and UnoCSS.
Extension entrypoints live in `entrypoints/`: `popup/` contains the popup UI,
`list/` contains the full list page, and `background.ts` / `content.ts` contain
extension runtime scripts. Shared Vue components are in `components/`, and shared
storage/domain helpers are in `utils/`. Static extension assets are split between
`public/` for packaged files such as icons and `assets/` for source assets.
Configuration is kept at the repository root: `wxt.config.ts`, `uno.config.ts`,
`eslint.config.ts`, and `tsconfig.json`.

## Build, Test, and Development Commands

Use pnpm for all package tasks.

- `pnpm dev`: start WXT development mode for Chromium-compatible browsers.
- `pnpm dev:firefox`: start WXT development mode targeting Firefox.
- `pnpm build`: create a production extension build.
- `pnpm build:firefox`: create a Firefox production build.
- `pnpm zip` / `pnpm zip:firefox`: package the built extension for distribution.
- `pnpm compile`: run `vue-tsc --noEmit` for TypeScript and Vue type checking.

There is no dedicated test script yet; use `pnpm compile` plus lint/format checks
before submitting changes.

## Coding Style & Naming Conventions

Code is TypeScript-first and uses Vue single-file components with
`<script lang="ts" setup>`. Follow the existing two-space indentation style,
double quotes, semicolons, and Prettier formatting. Component files use
PascalCase, for example `components/WebPageEditor.vue`; utility modules use
kebab-case, for example `utils/web-page.ts`. Keep reusable storage and browser
logic in `utils/`, not duplicated inside entrypoint components.

Linting is configured with ESLint flat config, TypeScript ESLint, Vue essential
rules, JSON/CSS rules, and `eslint-config-prettier`. `lint-staged` runs
`eslint --fix` and `prettier --write` for staged JS/TS/Vue files.

## Testing Guidelines

No test framework or coverage threshold is currently configured. For now, verify
changes with `pnpm compile` and manual extension checks in the target browser.
For Firefox packaging, follow the README flow: run `pnpm zip:firefox`, then load
the generated add-on from `about:addons`. If adding tests later, colocate them
near the behavior they cover and use names such as `web-page.test.ts`.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style messages with optional scopes, such
as `feat(popup): adjust font size and layout spacing`, `fix: add gecko extension
ID`, and `docs: add Firefox local installation guide`. Keep commits focused and
use scopes that match the touched area (`popup`, `list`, `docs`, etc.).

Pull requests should include a short problem/solution summary, verification steps
run locally, linked issues when applicable, and screenshots or screen recordings
for UI changes in `popup/` or `list/`.
