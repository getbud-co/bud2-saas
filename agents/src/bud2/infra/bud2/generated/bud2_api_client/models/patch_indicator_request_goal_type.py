from enum import Enum


class PatchIndicatorRequestGoalType(str, Enum):
    ABOVE = "above"
    BELOW = "below"
    BETWEEN = "between"
    REACH = "reach"
    SURVEY = "survey"

    def __str__(self) -> str:
        return str(self.value)
