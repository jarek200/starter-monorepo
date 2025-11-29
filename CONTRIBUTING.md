# Contributing Guide

## Development Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up Git hooks** (automatically done via `pnpm prepare`)
   ```bash
   pnpm prepare
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

## Code Quality

### Linting & Formatting

We use [Biome](https://biomejs.dev/) for linting and formatting.

- **Check**: `pnpm lint`
- **Fix**: `pnpm lint:fix`
- **Format**: `pnpm format`

### Type Checking

- **Type check**: `pnpm typecheck`

### Testing

- **Unit tests**: `pnpm test`
- **Watch mode**: `pnpm test:watch`
- **Coverage**: `pnpm test:coverage`
- **E2E tests**: `pnpm test:e2e`

## Git Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass: `pnpm test`
4. Ensure linting passes: `pnpm lint`
5. Commit your changes (pre-commit hooks will run automatically)
6. Push and create a pull request

## Project Structure

```
sst-monorepo/
├── apps/
│   └── web/              # SvelteKit frontend
├── packages/
│   ├── core/             # Shared types and utilities
│   └── graphql/          # GraphQL schema
├── infra/                # Infrastructure code
└── e2e/                  # End-to-end tests
```

## Adding New Features

### Adding a new GraphQL type

1. Update `packages/graphql/schema.graphql`
2. Add resolvers in `infra/api/resolvers/`
3. Add types in `packages/core/src/types/`
4. Add service functions in `apps/web/src/lib/services/graphql.ts`

### Adding a new package

1. Create directory in `packages/`
2. Add `package.json` with name `@sst-monorepo/your-package`
3. Update `pnpm-workspace.yaml` if needed (should auto-detect)
4. Install dependencies: `pnpm install`

## Commit Messages

Use conventional commits format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Example: `feat: add user profile page`





