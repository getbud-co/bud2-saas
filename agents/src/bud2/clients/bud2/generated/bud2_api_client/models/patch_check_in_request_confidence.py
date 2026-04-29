from enum import Enum


class PatchCheckInRequestConfidence(str, Enum):
    BARRIER = "barrier"
    DEPRIORITIZED = "deprioritized"
    HIGH = "high"
    LOW = "low"
    MEDIUM = "medium"

    def __str__(self) -> str:
        return str(self.value)
