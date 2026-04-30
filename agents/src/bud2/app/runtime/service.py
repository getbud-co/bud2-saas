from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AgentRuntimeResult:
    text: str
    raw_result: Any | None = None


class AgentRuntime:
    def __init__(self, root_agent: Any) -> None:
        self._root_agent = root_agent

    async def run_text(self, text: str) -> AgentRuntimeResult:
        # ADK execution wiring will be implemented when the first real channel flow is enabled.
        return AgentRuntimeResult(text=f"Received: {text}")
