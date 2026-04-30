from enum import Enum


class PatchMissionRequestVisibility(str, Enum):
    PRIVATE = "private"
    PUBLIC = "public"
    TEAM_ONLY = "team_only"

    def __str__(self) -> str:
        return str(self.value)
