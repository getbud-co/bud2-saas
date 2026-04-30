from enum import Enum


class RoleScope(str, Enum):
    ORG = "org"
    SELF = "self"
    TEAM = "team"

    def __str__(self) -> str:
        return str(self.value)
