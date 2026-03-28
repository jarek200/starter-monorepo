# Away — `packages/agent-core` (Bedrock AgentCore + Strands)

This package follows the official **Amazon Bedrock AgentCore starter toolkit** flow for TypeScript ([AWS docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-toolkit-typescript.html)).

## Prerequisites

- **Node 20+** (repo uses 22 — OK)
- **Python 3.10+** — required for the `agentcore` CLI
- **AWS credentials** with permissions for the toolkit ([starter toolkit permissions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-permissions.html#runtime-permissions-starter-toolkit))
- **Bedrock model access** enabled in the console for models your Strands agent uses

## 1. Install the CLI (once per machine)

```bash
pip install --upgrade bedrock-agentcore-starter-toolkit
agentcore --help
```

## 2. Install Node dependencies (from repo root)

```bash
pnpm install
```

## 3. Configure deployment (run inside this directory)

From **`packages/agent-core/`** (not repo root):

```bash
cd packages/agent-core
agentcore configure --entrypoint src/agent.ts
```

The CLI will prompt for an agent name and create **`.bedrock_agentcore.yaml`**.  
TypeScript agents use **container** deployment (toolkit handles CodeBuild / ECR).

## 4. Run locally (mimics AgentCore runtime)

Still in `packages/agent-core/`:

```bash
agentcore dev
```

Default: **http://localhost:8080**. In another terminal:

```bash
agentcore invoke --dev '{"prompt": "Hello!"}'
```

Or from repo root, use the pnpm shortcut (plain `tsx` dev, not the toolkit emulator):

```bash
pnpm away
```

For **toolkit-accurate** local behavior, prefer `agentcore dev` inside `packages/agent-core`.

## 5. Deploy to AWS

```bash
cd packages/agent-core
agentcore deploy
```

Save the **agent runtime ARN** from the output. Invoke:

```bash
agentcore invoke '{"prompt": "tell me a joke"}'
```

## 6. Clean up

```bash
cd packages/agent-core
agentcore destroy
```

## Monorepo notes

- **`pnpm away`** → `pnpm --filter @sst-monorepo/agent-core dev` (watches `src/agent.ts` only).
- **`.bedrock_agentcore.yaml`** is local/toolkit-specific; add to git if your team shares deploy config, or keep private — do not commit secrets.
- **SST** (`sst.config.ts`) is unchanged; AgentCore deploy is separate until you choose to wire IAM/outputs in `infra/`.

## Cursor

Use the **Away** rule (`.cursor/rules/away.mdc`) when editing agent code.
