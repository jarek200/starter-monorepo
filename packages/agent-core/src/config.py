"""Environment-driven AgentCore + Strands configuration."""

import os

AWS_REGION = os.environ.get("AWS_REGION", "eu-west-1")

# AgentCore Memory (short-term by default; enable LTM retrieval with AGENTCORE_MEMORY_LTM=true)
AGENTCORE_MEMORY_ID = os.environ.get("AGENTCORE_MEMORY_ID", "").strip()
AGENTCORE_MEMORY_BATCH_SIZE = max(1, min(100, int(os.environ.get("AGENTCORE_MEMORY_BATCH_SIZE", "1"))))
AGENTCORE_MEMORY_LTM = os.environ.get("AGENTCORE_MEMORY_LTM", "").lower() in ("1", "true", "yes")

# Strands MCP (stdio server). Example: MCP_SERVER_COMMAND=uvx, MCP_SERVER_ARGS=awslabs.aws-documentation-mcp-server@latest
MCP_SERVER_COMMAND = os.environ.get("MCP_SERVER_COMMAND", "").strip()
MCP_SERVER_ARGS = [
    part for part in os.environ.get("MCP_SERVER_ARGS", "").split() if part
]

SYSTEM_PROMPT = os.environ.get(
    "AGENT_SYSTEM_PROMPT",
    "You are a helpful assistant for this application. Be concise and accurate.",
)
