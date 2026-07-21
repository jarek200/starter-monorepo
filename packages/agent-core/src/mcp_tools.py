"""Strands MCP client (stdio transport)."""

from contextlib import contextmanager
from collections.abc import Iterator

from mcp import StdioServerParameters, stdio_client
from strands.tools.mcp import MCPClient

from config import MCP_SERVER_ARGS, MCP_SERVER_COMMAND


@contextmanager
def mcp_client() -> Iterator[MCPClient | None]:
    """
    Connect to an MCP server over stdio when MCP_SERVER_COMMAND is set.

    The client must stay open for the duration of the agent invocation.
    """
    if not MCP_SERVER_COMMAND:
        yield None
        return

    client = MCPClient(
        lambda: stdio_client(
            StdioServerParameters(command=MCP_SERVER_COMMAND, args=MCP_SERVER_ARGS)
        )
    )

    with client:
        yield client
