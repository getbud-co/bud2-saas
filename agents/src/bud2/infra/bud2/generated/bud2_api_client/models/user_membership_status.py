from enum import Enum


class UserMembershipStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    INVITED = "invited"

    def __str__(self) -> str:
        return str(self.value)
