from enum import Enum


class IndicatorStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    AT_RISK = "at_risk"
    DONE = "done"
    DRAFT = "draft"

    def __str__(self) -> str:
        return str(self.value)
