from enum import Enum


class UserGender(str, Enum):
    FEMININO = "feminino"
    MASCULINO = "masculino"
    NAO_BINARIO = "nao-binario"
    PREFIRO_NAO_DIZER = "prefiro-nao-dizer"

    def __str__(self) -> str:
        return str(self.value)
