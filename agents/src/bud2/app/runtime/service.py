from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from bud2.infra.auth.credentials import CredentialContext
from bud2.infra.bud2.tools.missions import MissionTools
from bud2.infra.bud2.tools.teams import TeamTools


@dataclass(frozen=True)
class AgentRuntimeResult:
    text: str
    raw_result: Any | None = None


class AgentRuntime:
    def __init__(
        self,
        root_agent_factory: Any,
        mission_tools: MissionTools,
        team_tools: TeamTools,
    ) -> None:
        self._root_agent_factory = root_agent_factory
        self._mission_tools = mission_tools
        self._team_tools = team_tools

    def _build_tools(self, credential_context: CredentialContext) -> list[Any]:
        """Bind tools to the current credential context so the ADK can call them."""
        bound_tools: list[Any] = []

        async def _list_missions(page: int = 1, size: int = 20) -> Any:
            return await self._mission_tools.list_missions(
                credential_context, page=page, size=size
            )

        async def _get_mission(mission_id: str) -> Any:
            return await self._mission_tools.get_mission(
                credential_context, mission_id=mission_id
            )

        async def _list_teams(page: int = 1, size: int = 20) -> Any:
            return await self._team_tools.list_teams(
                credential_context, page=page, size=size
            )

        # Preserve docstrings for ADK tool discovery
        _list_missions.__doc__ = self._mission_tools.list_missions.__doc__
        _get_mission.__doc__ = self._mission_tools.get_mission.__doc__
        _list_teams.__doc__ = self._team_tools.list_teams.__doc__

        bound_tools.append(_list_missions)
        bound_tools.append(_get_mission)
        bound_tools.append(_list_teams)

        return bound_tools

    async def run(
        self,
        text: str,
        credential_context: CredentialContext,
        history: list[dict[str, str]] | None = None,
    ) -> AgentRuntimeResult:
        """Run the agent with user text and optional conversation history."""
        tools = self._build_tools(credential_context)
        agent = self._root_agent_factory(tools=tools)

        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types

        session_service = InMemorySessionService()  # type: ignore[no-untyped-call]
        user_id = credential_context.external_user_id or "anonymous"
        session_id = credential_context.external_user_id or "default"

        session_service.create_session(  # type: ignore[unused-coroutine]
            app_name="bud2",
            user_id=user_id,
            session_id=session_id,
        )

        runner = Runner(agent=agent, app_name="bud2", session_service=session_service)

        content = types.Content(role="user", parts=[types.Part(text=text)])

        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                part_text = event.content.parts[0].text
                return AgentRuntimeResult(text=part_text or "Não consegui processar sua mensagem.")

        return AgentRuntimeResult(text="Não consegui processar sua mensagem. Tente novamente.")
