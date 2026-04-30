from enum import Enum


class CreateMissionRequestMembersItemRole(str, Enum):
    OBSERVER = "observer"
    OWNER = "owner"
    SUPPORTER = "supporter"

    def __str__(self) -> str:
        return str(self.value)
