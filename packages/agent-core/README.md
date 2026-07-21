# Python Bedrock AgentCore — `packages/agent-core`

Strands Agents on **Amazon Bedrock AgentCore Runtime**, with optional **MCP tools** and **AgentCore Memory** (short-term by default).

## Prerequisites

- **Python 3.10+**
- **Node.js 20+** — for the official [AgentCore CLI](https://github.com/aws/agentcore-cli) (`npm install -g @aws/agentcore`)
- **uv** (recommended for Python agents) or `python3 -m venv`
- **AWS credentials** + Bedrock model access in your region (default **`eu-west-1`**, aligned with this monorepo)

> **Note:** The old Python `bedrock-agentcore-starter-toolkit` is superseded by **`@aws/agentcore`**. Uninstall it if both are present (`pip uninstall bedrock-agentcore-starter-toolkit`).

## 1. Python environment

```bash
cd packages/agent-core
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy env template and set values as needed:

```bash
cp .env.example .env.local
# export $(grep -v '^#' .env.local | xargs)   # optional: load into shell
```

## 2. AgentCore CLI (deploy path)

Install globally (once):

```bash
npm install -g @aws/agentcore
agentcore --version
```

**Greenfield** (AWS-recommended project layout):

```bash
agentcore create --name my-agent --framework Strands --model-provider Bedrock --memory none
# Copy or point app/MyAgent/main.py at this repo's src/agent.py patterns
```

**This monorepo embed** — agent code lives in `src/`; wire deploy by creating an AgentCore project here or pointing your CLI project entrypoint at `src/agent.py`.

Common CLI loop:

```bash
agentcore dev          # local server + inspector
agentcore deploy       # CDK-backed deploy to AgentCore Runtime
agentcore invoke --prompt "Hello"
agentcore logs
```

Add capabilities after scaffold:

```bash
agentcore add memory   # STM; add --strategies for LTM
agentcore add gateway  # MCP / OpenAPI / Lambda targets (managed connectivity)
agentcore deploy
```

## 3. Run locally (without full CLI project)

Direct entrypoint (BedrockAgentCoreApp local mode):

```bash
cd packages/agent-core
source .venv/bin/activate
python3 src/agent.py
```

With MCP (example — AWS Documentation MCP server):

```bash
export MCP_SERVER_COMMAND=uvx
export MCP_SERVER_ARGS='awslabs.aws-documentation-mcp-server@latest'
python3 src/agent.py
```

With AgentCore Memory (after `agentcore add memory` + deploy, copy memory id):

```bash
export AGENTCORE_MEMORY_ID=your-memory-id
export AGENTCORE_MEMORY_BATCH_SIZE=1   # STM: flush each turn (default)
python3 src/agent.py
```

Invoke payload shape:

```json
{
  "prompt": "What is AppSync?",
  "session_id": "session-123",
  "actor_id": "user-456"
}
```

## 4. Project layout

```
packages/agent-core/
├── src/
│   ├── agent.py       # BedrockAgentCoreApp entrypoint
│   ├── config.py      # env-driven settings
│   ├── memory.py      # AgentCoreMemorySessionManager (STM / optional LTM)
│   └── mcp_tools.py   # Strands MCPClient (stdio)
├── requirements.txt
├── .env.example
└── README.md
```

## 5. Memory modes

| Mode | Config | Use |
|------|--------|-----|
| **None** | omit `AGENTCORE_MEMORY_ID` | Stateless agent |
| **Short-term (STM)** | memory id, `AGENTCORE_MEMORY_LTM=false` | Conversation persistence per session |
| **Long-term (LTM)** | memory id + LTM strategies on resource + `AGENTCORE_MEMORY_LTM=true` | Preferences, facts, summaries across sessions |

Use `AGENTCORE_MEMORY_BATCH_SIZE=1` for lowest latency (each turn persisted immediately). Increase (2–100) to batch API calls; always use the session manager context manager so buffers flush.

## 6. MCP options

| Approach | When |
|----------|------|
| **Strands `MCPClient`** (this repo) | Local/dev or runtime with stdio MCP server (`mcp_tools.py`) |
| **AgentCore Gateway** | Production: `agentcore add gateway` + MCP target — governed, no stdio in runtime |

## 7. Monorepo integration

- SST (`sst.config.ts`) is unchanged; AgentCore deploy is separate until you wire runtime ARN / IAM in `infra/`.
- Lambdas in `packages/functions/` can invoke the deployed runtime from your app.
- Cursor rules: **Python AgentCore** + **AgentCore Strands MCP & Memory**.

## References

- [AgentCore CLI](https://github.com/aws/agentcore-cli)
- [Get started with AgentCore CLI](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html)
- [Strands + AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/strands-sdk-memory.html)
- [Strands MCP tools](https://github.com/strands-agents/sdk-python)
