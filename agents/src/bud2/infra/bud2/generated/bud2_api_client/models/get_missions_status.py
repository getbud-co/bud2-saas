from enum import Enum


class GetMissionsStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    DRAFT = "draft"
    PAUSED = "paused"

    def __str__(self) -> str:
        return str(self.value)
