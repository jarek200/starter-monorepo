# Contributing

Thanks for contributing to this starter monorepo.

## Prerequisites

- Node.js 22 (use `.nvmrc`)
- pnpm 10+
- AWS CLI with SSO configured

## Setup

```bash
pnpm install
pnpm prepare
```

## Daily workflow

```bash
pnpm dev
```

## Quality checks

Run all checks before opening a PR:

```bash
pnpm verify
```

Equivalent commands:

```bash
pnpm codegen
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Commit and PR conventions

- Keep commits focused and small.
- Use conventional commits when possible (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- If schema or resolver logic changes, include regenerated GraphQL types.
- In PR descriptions, include:
  - what changed
  - why it changed
  - how you tested it

## Starter-focused note

If you are using this template for a new project, update project names, AWS account IDs,
environment configuration, and deployment labels before first production deployment.
# Contributing

Thanks for contributing to this starter monorepo.

## Prerequisites

- Node.js 22 (use `.nvmrc`)
- pnpm 10+
- AWS CLI with SSO configured

## Setup

```bash
pnpm install
pnpm prepare
```

## Daily workflow

```bash
pnpm dev
```

## Quality checks

Run all checks before opening a PR:

```bash
pnpm verify
```

Equivalent commands:

```bash
pnpm codegen
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Commit and PR conventions

- Keep commits focused and small.
- Use conventional commits when possible (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- If schema or resolver logic changes, include regenerated GraphQL types.
- In PR descriptions, include:
  - what changed
  - why it changed
  - how you tested it

## Starter-focused note

If you are using this template for a new project, update project names, AWS account IDs,
environment configuration, and deployment labels before first production deployment.
