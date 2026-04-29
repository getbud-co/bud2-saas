from enum import Enum


class CycleType(str, Enum):
    ANNUAL = "annual"
    CUSTOM = "custom"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"

    def __str__(self) -> str:
        return str(self.value)
