from enum import Enum


class TeamMemberRoleInTeam(str, Enum):
    LEADER = "leader"
    MEMBER = "member"
    OBSERVER = "observer"

    def __str__(self) -> str:
        return str(self.value)
