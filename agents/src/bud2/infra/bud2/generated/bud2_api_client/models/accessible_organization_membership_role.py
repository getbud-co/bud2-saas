from enum import Enum


class AccessibleOrganizationMembershipRole(str, Enum):
    ADMIN_RH = "admin-rh"
    COLABORADOR = "colaborador"
    GESTOR = "gestor"
    SUPER_ADMIN = "super-admin"
    VISUALIZADOR = "visualizador"

    def __str__(self) -> str:
        return str(self.value)
