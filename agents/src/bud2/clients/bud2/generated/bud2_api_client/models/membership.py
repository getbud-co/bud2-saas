from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.membership_role import MembershipRole
from ..models.membership_status import MembershipStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="Membership")


@_attrs_define
class Membership:
    """
    Attributes:
        id (UUID):
        organization_id (UUID):
        user_id (UUID):
        role (MembershipRole):
        status (MembershipStatus):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        invited_by_user_id (UUID | Unset):
        joined_at (datetime.datetime | Unset):
    """

    id: UUID
    organization_id: UUID
    user_id: UUID
    role: MembershipRole
    status: MembershipStatus
    created_at: datetime.datetime
    updated_at: datetime.datetime
    invited_by_user_id: UUID | Unset = UNSET
    joined_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        organization_id = str(self.organization_id)

        user_id = str(self.user_id)

        role = self.role.value

        status = self.status.value

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        invited_by_user_id: str | Unset = UNSET
        if not isinstance(self.invited_by_user_id, Unset):
            invited_by_user_id = str(self.invited_by_user_id)

        joined_at: str | Unset = UNSET
        if not isinstance(self.joined_at, Unset):
            joined_at = self.joined_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "organization_id": organization_id,
                "user_id": user_id,
                "role": role,
                "status": status,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if invited_by_user_id is not UNSET:
            field_dict["invited_by_user_id"] = invited_by_user_id
        if joined_at is not UNSET:
            field_dict["joined_at"] = joined_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        organization_id = UUID(d.pop("organization_id"))

        user_id = UUID(d.pop("user_id"))

        role = MembershipRole(d.pop("role"))

        status = MembershipStatus(d.pop("status"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        _invited_by_user_id = d.pop("invited_by_user_id", UNSET)
        invited_by_user_id: UUID | Unset
        if isinstance(_invited_by_user_id, Unset):
            invited_by_user_id = UNSET
        else:
            invited_by_user_id = UUID(_invited_by_user_id)

        _joined_at = d.pop("joined_at", UNSET)
        joined_at: datetime.datetime | Unset
        if isinstance(_joined_at, Unset):
            joined_at = UNSET
        else:
            joined_at = isoparse(_joined_at)

        membership = cls(
            id=id,
            organization_id=organization_id,
            user_id=user_id,
            role=role,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
            invited_by_user_id=invited_by_user_id,
            joined_at=joined_at,
        )

        membership.additional_properties = d
        return membership

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
