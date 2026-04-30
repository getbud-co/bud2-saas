from enum import Enum


class CreateTagRequestColor(str, Enum):
    CARAMEL = "caramel"
    ERROR = "error"
    NEUTRAL = "neutral"
    ORANGE = "orange"
    SUCCESS = "success"
    WARNING = "warning"
    WINE = "wine"

    def __str__(self) -> str:
        return str(self.value)
