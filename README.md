# SST Monorepo Starter

> Template Repository — click "Use this template" to create a new project from this starter

A modern, production-ready platform template for building full-stack serverless applications on AWS with multi-environment support.

- **Frontend**: SvelteKit 2 + TypeScript + Tailwind CSS
- **Backend**: AWS AppSync (GraphQL) with JavaScript resolvers
- **Database**: DynamoDB (single-table design)
- **Authentication**: AWS Cognito User Pools
- **Infrastructure**: SST v4 with Pulumi
- **Monorepo**: pnpm workspaces + Turborepo (task caching)
- **Agents (optional)**: `packages/agent-core` — Python **Strands** + **Bedrock AgentCore** (MCP + Memory) — see `packages/agent-core/README.md` and Cursor rules **Python AgentCore** / **AgentCore Strands MCP & Memory**

## Architecture overview

```
pnpm workspace (root)
├── apps/web          SvelteKit web app — landing, login, dashboard (SST SvelteKit component)
├── packages/         Shared code (core, graphql, functions, agent-core)
├── infra/            SST infrastructure modules (AppSync, Cognito, DynamoDB)
└── sst.config.ts     SST v4 config — stage-aware, multi-account
```

## Environments

### Local dev (hot reload)

**`pnpm dev`** runs [SST dev mode](https://sst.dev/docs/reference/cli/#dev) — live Lambda linking and hot reload. This uses a **personal stage** (your OS username by default), **not** the shared `int` / `stage` / `prod` deploy targets.

Map the `dev` profile in `sst.config.ts` (`STAGE_PROFILES.dev`) to the AWS account you use for local work — often the same account as `int`, but a **different stage name** so personal stacks never overwrite shared environments.

```bash
pnpm dev   # SST dev: hot reload, env vars injected automatically
```

### Shared deploy stages (max 3 AWS accounts)

Three **deploy** stages — each maps to its own AWS account (provisioned via admin factory, CI labels, or `pnpm sst:deploy <stage>`):

| Stage   | Purpose                   | AWS account  | Removal policy |
|---------|---------------------------|--------------|----------------|
| `int`   | Integration / shared demo | int account  | `remove`       |
| `stage` | Pre-production validation | stage account| `remove`       |
| `prod`  | Live production           | prod account | `retain`       |

Personal stages from `pnpm dev` fall back to the **`dev`** profile and **`dev`** resource config — separate from `int`, `stage`, and `prod`.

## Prerequisites

- **Node.js 24** (`nvm install 24`)
- **pnpm** (`npm install -g pnpm`)
- **AWS CLI** and SSO configured (see [Local AWS setup](#local-aws-setup))

## Quick Start

### 1. Install dependencies

```bash
nvm use
pnpm install
```

### 2. Local AWS setup

Follow [SST's AWS accounts guide](https://sst.dev/docs/aws-accounts) to set up AWS Organizations
with SSO. Then configure `~/.aws/config`:

```ini
[sso-session acme]
sso_start_url  = https://acme.awsapps.com/start
sso_region     = eu-west-1

[profile acme-dev]
sso_session    = acme
sso_account_id = 111111111111
sso_role_name  = AdministratorAccess
region         = eu-west-1

[profile acme-int]
sso_session    = acme
sso_account_id = 111111111111
sso_role_name  = AdministratorAccess
region         = eu-west-1

[profile acme-stage]
sso_session    = acme
sso_account_id = 222222222222
sso_role_name  = AdministratorAccess
region         = eu-west-1

[profile acme-prod]
sso_session    = acme
sso_account_id = 333333333333
sso_role_name  = AdministratorAccess
region         = eu-west-1
```

Log in:

```bash
pnpm sso
# Or: aws sso login --sso-session=acme
```

Rename the profile keys in `sst.config.ts` (`STAGE_PROFILES` map at the top) to match your
actual profile names.

### 3. Start local development (hot reload)

```bash
pnpm dev   # SST dev mode: live linking + hot reload (personal stage, not int/stage/prod)
```

`pnpm dev` automatically injects environment variables — no `.env` file needed. This is separate from `pnpm sst:deploy int` and the CI deploy labels.

### 4. Deploy to shared environments

Root scripts (pass the stage name as an argument):

| Script | Example | Purpose |
|--------|---------|---------|
| `pnpm dev` | `pnpm dev` | Local hot reload (personal stage) |
| `pnpm sst:deploy` | `pnpm sst:deploy int` | Deploy to int, stage, prod, or dev |
| `pnpm sst:remove` | `pnpm sst:remove int` | Tear down a stage stack |
| `pnpm verify` | `pnpm verify` | Codegen, lint, typecheck, test, build |
| `pnpm sso` | `pnpm sso` | AWS SSO login |

```bash
pnpm sst:deploy int
pnpm sst:deploy stage
pnpm sst:deploy prod
```

## Rename guide

After **Use this template** (or when the Admin factory has not run rename yet), set project-specific names before your first deploy.

**Automated (recommended):**

```bash
./scripts/rename-project.sh --scope mycompany --app my-app
# optional: --sso mycompany  (defaults to scope)
pnpm install
pnpm verify
```

This replaces `@sst-monorepo` → `@mycompany`, `sst-monorepo-starter` → `my-app`, and SSO placeholder `acme` → `mycompany` in `package.json` and README.

**Admin factory:** after `CreateRepo`, provisioning runs the same replacements with `--scope "$githubOrg" --app "$slug"`.

### Manual reference

| Find | Replace with | Files |
|------|--------------|-------|
| `@sst-monorepo/core` | `@mycompany/core` | `packages/core/package.json`, imports, `vitest.config.ts` |
| `@sst-monorepo/graphql` | `@mycompany/graphql` | `packages/graphql/package.json`, imports |
| `@sst-monorepo/functions` | `@mycompany/functions` | `packages/functions/package.json` |
| `@sst-monorepo/web` | `@mycompany/web` | `apps/web/package.json`, `.lintstagedrc.json` |
| `sst-monorepo-starter` | `my-app` | Root `package.json`, `sst.config.ts` (`name` field) |

Search the repo for `@sst-monorepo` and `sst-monorepo-starter` to catch any remaining references.

### 2. AWS SSO and profiles

In `~/.aws/config`, replace the `acme` SSO session and `acme-dev` / `acme-int` / `acme-stage` / `acme-prod` profile names with yours. The three deploy accounts are **int**, **stage**, and **prod** (plus optional `dev` profile for local hot reload).

Then align:

- `sst.config.ts` — `STAGE_PROFILES` map (`dev` for local hot reload; `int`, `stage`, `prod` for deploys)
- Root `package.json` — `sso` script (`aws sso login --sso-session=…`)

### 3. GitHub Environments and IAM

For each GitHub Environment (`int`, `stage`, `prod`):

- Secret `AWS_ROLE_ARN` — OIDC role in that AWS account
- Optional: `DNS_ROLE_ARN`, vars `APP_URL`, `APPS_HOSTED_ZONE_ID`

Trust policy subject: `repo:<org>/<repo>:environment:<env-name>`.

### 4. Deploy labels

Bootstrap labels in your new repo (requires [GitHub CLI](https://cli.github.com/)):

```bash
./scripts/bootstrap-github-labels.sh owner/my-app
```

Or create them manually — see [Create the PR labels](#create-the-pr-labels).

### 5. Verify

```bash
pnpm install
pnpm verify
```

## New project checklist

After renaming, before shipping:

- Run `./scripts/rename-project.sh --scope … --app …` if placeholders remain (Admin factory runs this automatically).

- Update AWS account IDs, profile names, and role ARNs in `sst.config.ts` and GitHub Environments.
- If you use delegated app domains, set `APP_URL`, `APPS_HOSTED_ZONE_ID`, and `DNS_ROLE_ARN` in each GitHub Environment.
- Run `./scripts/bootstrap-github-labels.sh owner/repo` (or create deploy labels manually).
- Enable **branch protection rules** on `main` (see [Branch protection](#branch-protection) below).
- Review defaults in `infra/` (domain names, auth settings, table names, retention policy).
- Run `pnpm verify` and make sure CI passes before first deployment.

## Project structure

```
sst-monorepo/
├── apps/
│   └── web/                      SvelteKit UI
│       ├── src/
│       │   ├── lib/
│       │   │   ├── components/ui/  UI components
│       │   │   ├── services/       GraphQL service
│       │   │   └── stores/         Auth store
│       │   └── routes/
│       │       ├── +page.svelte    Landing
│       │       ├── login/          Sign in / sign up
│       │       └── (protected)/dashboard/  Post-login dashboard
│       └── package.json
├── packages/
│   ├── core/                     Shared types and utilities
│   ├── functions/                Lambda functions
│   │   └── auth/                 User profile creation trigger
│   └── graphql/                  GraphQL schema + codegen output
├── infra/                        SST infrastructure modules
│   ├── storage.ts                DynamoDB table
│   ├── functions.ts              Lambda function definitions
│   ├── auth.ts                   Cognito User Pool
│   └── api/
│       ├── api-setup.ts          AppSync API and data sources
│       └── resolvers/            GraphQL resolvers (JS, AppSync-native)
│           ├── index.ts
│           └── users.ts
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                Quality gate (lint, typecheck, test, build)
│   │   └── deploy.yml            Label-driven deploy pipeline
│   └── dependabot.yml            Automated dependency updates
├── sst.config.ts                 SST v4 config (stages, accounts, resources)
├── turbo.json                    Turborepo task pipeline (build, typecheck, test, codegen)
├── LICENSE
└── package.json
```

## SST v4 migration notes

This project uses **SST v4** (upgraded from v3/Ion).

Key changes from v3:
- Pulumi AWS provider bumped from v6 to v7 (already reflected in `package.json`)
- No breaking changes to SST components used here (Dynamo, CognitoUserPool, AppSync, Function, SvelteKit)
- `svelte-kit-sst` stays at `"2"` (the v3 package is experimental and built against SvelteKit v1)

If you have existing stacks deployed under SST v3, migrate them before deploying with v4:

```bash
# 1. Review what will change
pnpm exec sst diff --stage int

# 2. Migrate state (run once per stage, do NOT use --target)
pnpm exec sst refresh --stage int
pnpm exec sst refresh --stage stage
pnpm exec sst refresh --stage prod
# For stages that only ever ran under sst dev:
pnpm exec sst refresh --stage int --dev

# 3. Deploy as normal
pnpm sst:deploy int
```

## GitHub Actions and label-driven deployment

CI runs automatically on every PR and push to `main`. Jobs: **lint**, **typecheck** (with codegen drift check), **test**, and **build** — build only runs when lint and tests pass.

Deployment is triggered by **adding labels to an open PR**:

```
Open PR
  └─ add label "deploy:int"   → deploys SST to int account
       └─ passes → add label "deploy:stage" → deploys to stage account
            └─ passes → add label "deploy:prod" → deploys to prod account
                 └─ passes → merge PR
```

The `deploy:stage` gate requires `deploy:int` on the PR.
The `deploy:prod` gate requires both `deploy:int` and `deploy:stage`.
The `prod` GitHub Environment additionally requires a human reviewer to approve.
After a successful prod deploy, the workflow **automatically merges the PR into `main`**
(if the PR targets `main`; PRs targeting other branches are left open).

### One-time GitHub setup

1. Create three GitHub Environments: `int`, `stage`, `prod`
   - On `prod`: enable **Required reviewers**
2. Add `AWS_ROLE_ARN` secret to each Environment:
   - `int` → `arn:aws:iam::111111111111:role/GitHubActions-int`
   - `stage` → `arn:aws:iam::222222222222:role/GitHubActions-stage`
   - `prod` → `arn:aws:iam::333333333333:role/GitHubActions-prod`
3. If you want automated custom domains, also add:
   - Variable `APP_URL`
     - `int` → deployed app URL for that environment
     - `stage` → deployed app URL for that environment
     - `prod` → deployed app URL for that environment
   - Variable `APPS_HOSTED_ZONE_ID`
     - delegated Route 53 hosted zone ID for your apps domain
   - Secret `DNS_ROLE_ARN`
     - cross-account role ARN that can manage DNS in that hosted zone
4. Create IAM OIDC provider in each AWS account and a role with this trust condition:
   ```json
   "token.actions.githubusercontent.com:sub":
     "repo:<org>/<repo>:environment:<env-name>"
   ```

No long-lived AWS credentials are stored in GitHub secrets.

### Create the PR labels

Bootstrap all deploy labels (including failure labels used by CI):

```bash
./scripts/bootstrap-github-labels.sh owner/repo
```

Or create them manually in GitHub (Settings → Labels):

| Label                | Colour suggestion | Purpose                   |
|----------------------|-------------------|---------------------------|
| `deploy:int`         | `#0075ca`         | Trigger int deployment    |
| `deploy:stage`       | `#e4e669`         | Trigger stage deployment  |
| `deploy:prod`        | `#d93f0b`         | Trigger prod deployment   |
| `deploy-failed:int`  | `#d73a4a`         | Int deploy failed         |
| `deploy-failed:stage`| `#d73a4a`        | Stage deploy failed       |
| `deploy-failed:prod` | `#d73a4a`         | Prod deploy failed        |

### Branch protection

Enable branch protection on `main` (Settings → Branches → Add rule):

| Setting                                | Recommended value |
|----------------------------------------|-------------------|
| Require a pull request before merging  | Yes               |
| Required approvals                     | 1+                |
| Require status checks to pass          | `Lint & Type Check`, `Test`, `Build` |
| Require branches to be up to date      | Yes               |
| Restrict who can push                  | Admins only       |
| Do not allow bypassing the above       | Yes (for teams)   |

This prevents direct pushes to `main` and ensures every change goes through CI and code review.

## GraphQL code generation

After updating `packages/graphql/schema.graphql`:

```bash
pnpm codegen
pnpm --filter @sst-monorepo/graphql codegen:watch   # watch mode
```

Generated types are imported as:

```typescript
import type { User, UpdateUserInput } from '@sst-monorepo/graphql';
```

## Environment variables

`pnpm dev` (SST dev mode) injects all variables automatically — no `.env` needed.

For local-only frontend development, run `pnpm --filter @sst-monorepo/web dev` and set `VITE_*` variables the same way as in
`sst.config.ts`’s `sharedEnv` (or use `pnpm dev` so SST injects them).

## Database schema (DynamoDB — single-table design)

**Primary key**: `PK` (partition) + `SK` (sort)

**GSI1**: `GSI1PK` + `GSI1SK` — user-centric queries  
**GSI2**: `GSI2PK` + `GSI2SK` — global queries

Entity patterns:
- `USER#${userId}` / `PROFILE` — user profiles

## Adding new features

### New GraphQL type

1. Update `packages/graphql/schema.graphql`
2. Run `pnpm codegen`
3. Add resolver in `infra/api/resolvers/`
4. Add service method in `apps/web/src/lib/services/graphql.ts`

### New Lambda function

1. Create handler in `packages/functions/src/`
2. Define function in `infra/functions.ts`
3. Link it via `link:` in `sst.config.ts`

## Cost estimate

For a new app with fewer than 1,000 users:

| Service    | Free tier                               | Estimated cost |
|------------|-----------------------------------------|----------------|
| DynamoDB   | 25 GB storage, 25 R/W units             | $0–5/month     |
| AppSync    | 250K query/mutation operations          | $0–10/month    |
| Cognito    | 50K MAU                                 | $0             |
| Lambda     | 1M requests, 400K GB-seconds            | $0             |
| CloudFront | 1 TB data transfer                      | $0–5/month     |
| **Total**  |                                         | **$0–20/month**|

## License

[ISC](LICENSE)
