from enum import Enum


class UpdateMembershipRequestStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    INVITED = "invited"

    def __str__(self) -> str:
        return str(self.value)
