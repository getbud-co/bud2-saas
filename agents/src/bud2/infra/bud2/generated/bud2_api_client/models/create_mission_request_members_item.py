from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.create_mission_request_members_item_role import CreateMissionRequestMembersItemRole
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateMissionRequestMembersItem")


@_attrs_define
class CreateMissionRequestMembersItem:
    """
    Attributes:
        user_id (UUID):
        role (CreateMissionRequestMembersItemRole | Unset):
    """

    user_id: UUID
    role: CreateMissionRequestMembersItemRole | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = str(self.user_id)

        role: str | Unset = UNSET
        if not isinstance(self.role, Unset):
            role = self.role.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "user_id": user_id,
            }
        )
        if role is not UNSET:
            field_dict["role"] = role

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        user_id = UUID(d.pop("user_id"))

        _role = d.pop("role", UNSET)
        role: CreateMissionRequestMembersItemRole | Unset
        if isinstance(_role, Unset):
            role = UNSET
        else:
            role = CreateMissionRequestMembersItemRole(_role)

        create_mission_request_members_item = cls(
            user_id=user_id,
            role=role,
        )

        create_mission_request_members_item.additional_properties = d
        return create_mission_request_members_item

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
