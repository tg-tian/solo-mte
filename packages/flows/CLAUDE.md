# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Requirements

- Node.js v20.19+
- pnpm v10+

## Common Commands

Run from within each package directory (e.g., `packages/flow-designer/`):

```bash
# Development server
pnpm dev

# Build production
pnpm build
```

To run the development server, **use only the `packages/flow-content/eventflow` project** (do not run the dev command from other packages).

There is no test framework configured in this repository.

## Architecture Overview

This is a **pnpm monorepo** for a Vue 3-based visual flow/workflow designer. Workspace packages live under `packages/`.

### Package Dependency Graph

```
flow-content/{workflow,chatflow,eventflow}
        ↓ depends on
    flow-designer  ←→  flow-devkit
    flow-management    (core toolkit)
```

### Package Roles

- **flow-devkit** (`@farris/flow-devkit`) — Core library. Exports composition APIs, reusable components (ports, edges, node renderers), form-material field components, type definitions, and utilities. This is a **library** package that other packages import.

- **flow-designer** (`@farris/flow-designer`) — The main visual editor built on `@vue-flow/core`. Provides the `FlowDesigner` Vue component, built-in nodes (start, end, selector, loop, variable ops), toolbar, property panel, and canvas. Deployed as both an app and a library.

- **flow-management** — Flow lifecycle management UI (CRUD, versioning, publishing). Standalone app.

- **flow-content/workflow**, **flow-content/chatflow**, **flow-content/eventflow** — Domain-specific node extension packages. Each exports `NODES[]`, `componentRegistries[]`, and a `FLOW_REGISTRY` that plugs into flow-designer.

- **create-vueflow** — CLI scaffolding tool (`farris-create-vueflow`).

### Plugin Registration Pattern

Flow-content packages register themselves via a registry object:

```typescript
// flow-content/workflow/lib/index.ts
export const FLOW_REGISTRY = {
  layout: { ... },       // ELK layout config
  categories: [...],     // Node palette categories
};
export const NODES = [...];             // Node definitions
export const componentRegistries = [...]; // Custom property editors
```

flow-designer's `FlowDesigner` component accepts these as props to extend available nodes and editors.

### Data Model Conversion

`@vue-flow/core` uses its own internal graph representation. The hook `use-vue-flow-data-converter.ts` (in `flow-designer/src/hooks/`) handles bidirectional conversion between the VueFlow internal format and the domain model used by the backend API.

### Build Output Paths

Builds write directly to a shared dist tree:
- **flow-devkit**: `dist/web/platform/common/web/@farris/`
- **flow-designer**: `dist/web/platform/runtime/bcc/web/ai-flow/farris-flow-designer/`
- **flow-content/{type}**: `dist/web/platform/runtime/bcc/web/ai-flow/farris-flow-designer/flow-contents/{flow-type}/`

### Module Format

All packages build to **SystemJS** format (not ESM/CJS), intended for dynamic loading in a micro-frontend host environment.

### Local Source Aliasing

In `vite.config.ts` files, `@farris/flow-devkit` is aliased to the local `../flow-devkit/lib/index.ts` during development. TypeScript path aliases mirror this in `tsconfig.app.json`.

### API Proxy

`flow-management` dev server proxies API calls to `http://10.110.87.184:5400`. `flow-content/workflow` uses `VITE_API_TARGET` env var for its dev proxy (set via `dev:local` script with `cross-env`).
