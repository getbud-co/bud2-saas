from enum import Enum


class CreateIndicatorRequestGoalType(str, Enum):
    ABOVE = "above"
    BELOW = "below"
    BETWEEN = "between"
    REACH = "reach"
    SURVEY = "survey"

    def __str__(self) -> str:
        return str(self.value)
