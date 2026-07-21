"""Amazon Bedrock AgentCore entrypoint — Python Strands agent with optional MCP + Memory."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# Allow `from config import …` when entrypoint is `src/agent.py`.
_SRC = Path(__file__).resolve().parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from bedrock_agentcore import BedrockAgentCoreApp
from strands import Agent

from config import SYSTEM_PROMPT
from mcp_tools import mcp_client
from memory import memory_session

app = BedrockAgentCoreApp()


def _identity_from_request(payload: dict[str, Any], context: Any | None) -> tuple[str, str]:
    session_id = payload.get("session_id")
    actor_id = payload.get("actor_id") or payload.get("user_id")

    if context is not None:
        session_id = session_id or getattr(context, "session_id", None)
        actor_id = actor_id or getattr(context, "user_id", None)

    return str(session_id or "default-session"), str(actor_id or "anonymous")


def _run_agent(user_message: str, session_id: str, actor_id: str) -> str:
    with memory_session(session_id, actor_id) as session_manager:
        with mcp_client() as client:
            tools = client.list_tools_sync() if client else None
            agent = Agent(
                system_prompt=SYSTEM_PROMPT,
                session_manager=session_manager,
                tools=tools,
            )
            result = agent(user_message)
            return str(result.message)


@app.entrypoint
def invoke(payload: dict[str, Any], context: Any | None = None) -> dict[str, str]:
    """Process a prompt through Strands; optional session_id / actor_id in payload or context."""
    user_message = str(payload.get("prompt", "Hello! How can I help you today?"))
    session_id, actor_id = _identity_from_request(payload, context)
    message = _run_agent(user_message, session_id, actor_id)
    return {"result": message}


if __name__ == "__main__":
    app.run()
