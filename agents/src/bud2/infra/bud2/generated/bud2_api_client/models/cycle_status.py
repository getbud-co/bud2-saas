from enum import Enum


class CycleStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    ENDED = "ended"
    PLANNING = "planning"
    REVIEW = "review"

    def __str__(self) -> str:
        return str(self.value)
