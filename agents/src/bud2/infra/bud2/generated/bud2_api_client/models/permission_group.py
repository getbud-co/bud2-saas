from enum import Enum


class PermissionGroup(str, Enum):
    ASSISTANT = "assistant"
    MISSIONS = "missions"
    PEOPLE = "people"
    SETTINGS = "settings"
    SURVEYS = "surveys"

    def __str__(self) -> str:
        return str(self.value)
