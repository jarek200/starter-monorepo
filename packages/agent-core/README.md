# Away — `packages/agent-core`

Placeholder **Bedrock Agent Core**–compatible HTTP surface so you can run something locally before scaffolding the full toolkit.

## Run locally

```bash
# from repo root
pnpm away
```

Defaults to **http://localhost:8787** (`GET /ping`, `POST /invocations`).

## Replace with Agent Core (official)

Follow AWS: [Get started with the Amazon Bedrock AgentCore starter toolkit — TypeScript](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-toolkit-typescript.html).

Typical next steps:

1. Run the starter toolkit in **this directory** (or merge its output into `src/`).
2. Add `.bedrock_agentcore.yaml` (toolkit-generated).
3. Wire deploy + IAM in **`infra/`** / **`sst.config.ts`** when you move off localhost.

## Cursor

Enable the **Away** rule in Cursor (`.cursor/rules/away.mdc`) when working on agents so context stays aligned with Bedrock + Agent Core.
