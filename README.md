# PandQ

A desktop invoicing app built with Electron, React, and Vite.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install dependencies

```sh
npm install
```

### Set up your local environment

Environment variables are not committed. Copy the example file and adjust as needed:

```sh
cp .env.development.example .env.development
```

See [`.env.development.example`](.env.development.example) for all available variables and what they do.

### Run in development

```sh
npm run dev
```

---

## Environment Variables

All `VITE_*` variables are statically inlined by Vite at **build time**. They are never present as runtime files for end users — the values are baked directly into the compiled bundle.

| Variable | Default | Description |
|---|---|---|
| `VITE_SHOW_ONBOARDING` | `false` | Force the onboarding wizard to show on every launch. Useful when working on the onboarding UI. Has no effect in production builds. |

---

## Debug Flags

### Onboarding Wizard

Set `VITE_SHOW_ONBOARDING=true` in your `.env.development` to show the onboarding wizard on every app launch, regardless of whether the user has already completed it. Flip it back to `false` when you're done.

```sh
# .env.development
VITE_SHOW_ONBOARDING=true
```

---

## Project Structure

```
pandq/
├── electron/          # Main process + preload scripts
├── src/
│   ├── components/    # Reusable UI components
│   ├── layout/        # App shell (Sidebar etc.)
│   ├── pages/         # Top-level page components
│   ├── routes/        # Route key definitions
│   ├── types/         # Shared TypeScript types
│   └── utils/         # Helper utilities
├── .env.development.example   # Copy to .env.development
└── vite.config.ts
```

---

## Building

```sh
npm run build
```

The production bundle is written to `dist/`. `VITE_*` debug flags in `.env.development` are **not** included in production builds.
