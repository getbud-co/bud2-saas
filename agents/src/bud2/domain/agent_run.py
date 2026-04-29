from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

AgentRunStatus = Literal["pending", "running", "completed", "failed"]


@dataclass(frozen=True)
class AgentRun:
    id: str
    organization_id: str
    conversation_id: str
    status: AgentRunStatus
    created_at: datetime
    updated_at: datetime
