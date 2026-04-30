from __future__ import annotations

from typing import Any

from bud2.app.runtime.instructions import ROOT_AGENT_INSTRUCTION
from bud2.config import Settings


def build_root_agent(settings: Settings, tools: list[Any] | None = None) -> Any:
    from google.adk.agents import Agent

    return Agent(
        name="bud2_assistant",
        model=settings.gemini_model,
        instruction=ROOT_AGENT_INSTRUCTION,
        tools=tools or [],
    )
