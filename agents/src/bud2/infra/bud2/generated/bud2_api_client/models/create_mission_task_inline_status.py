from enum import Enum


class CreateMissionTaskInlineStatus(str, Enum):
    CANCELLED = "cancelled"
    DONE = "done"
    IN_PROGRESS = "in_progress"
    TODO = "todo"

    def __str__(self) -> str:
        return str(self.value)
