from enum import Enum


class IndicatorMeasurementMode(str, Enum):
    EXTERNAL = "external"
    MANUAL = "manual"
    MISSION = "mission"
    SURVEY = "survey"
    TASK = "task"

    def __str__(self) -> str:
        return str(self.value)
