"""AgentCore Memory session manager for Strands (STM + optional LTM retrieval)."""

from contextlib import contextmanager
from collections.abc import Iterator

from bedrock_agentcore.memory.integrations.strands.config import AgentCoreMemoryConfig, RetrievalConfig
from bedrock_agentcore.memory.integrations.strands.session_manager import AgentCoreMemorySessionManager

from config import (
    AGENTCORE_MEMORY_BATCH_SIZE,
    AGENTCORE_MEMORY_ID,
    AGENTCORE_MEMORY_LTM,
    AWS_REGION,
)


def build_memory_config(session_id: str, actor_id: str) -> AgentCoreMemoryConfig:
    """Build memory config. STM only unless AGENTCORE_MEMORY_LTM is enabled."""
    kwargs: dict = {
        "memory_id": AGENTCORE_MEMORY_ID,
        "session_id": session_id,
        "actor_id": actor_id,
        "batch_size": AGENTCORE_MEMORY_BATCH_SIZE,
    }

    if AGENTCORE_MEMORY_LTM:
        kwargs["retrieval_config"] = {
            f"/facts/{actor_id}": RetrievalConfig(top_k=3, relevance_score=0.5),
            f"/preferences/{actor_id}": RetrievalConfig(top_k=3, relevance_score=0.5),
            f"/summaries/{actor_id}/{session_id}": RetrievalConfig(top_k=3, relevance_score=0.5),
        }

    return AgentCoreMemoryConfig(**kwargs)


@contextmanager
def memory_session(session_id: str, actor_id: str) -> Iterator[AgentCoreMemorySessionManager | None]:
    """
    Yield an AgentCoreMemorySessionManager when AGENTCORE_MEMORY_ID is set.

    Uses a context manager so buffered messages flush on exit (required when batch_size > 1).
    """
    if not AGENTCORE_MEMORY_ID:
        yield None
        return

    config = build_memory_config(session_id, actor_id)
    with AgentCoreMemorySessionManager(config, region_name=AWS_REGION) as session_manager:
        yield session_manager
