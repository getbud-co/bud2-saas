from enum import Enum


class CreateMissionRequestKanbanStatus(str, Enum):
    DOING = "doing"
    DONE = "done"
    TODO = "todo"
    UNCATEGORIZED = "uncategorized"

    def __str__(self) -> str:
        return str(self.value)
