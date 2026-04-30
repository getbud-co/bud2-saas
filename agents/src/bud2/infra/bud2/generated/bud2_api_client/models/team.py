from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.team_color import TeamColor
from ..models.team_status import TeamStatus
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.team_member import TeamMember


T = TypeVar("T", bound="Team")


@_attrs_define
class Team:
    """
    Attributes:
        id (UUID):
        org_id (UUID):
        name (str):
        color (TeamColor):
        status (TeamStatus):
        members (list[TeamMember]):
        member_count (int):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        description (str | Unset):
    """

    id: UUID
    org_id: UUID
    name: str
    color: TeamColor
    status: TeamStatus
    members: list[TeamMember]
    member_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    description: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        org_id = str(self.org_id)

        name = self.name

        color = self.color.value

        status = self.status.value

        members = []
        for members_item_data in self.members:
            members_item = members_item_data.to_dict()
            members.append(members_item)

        member_count = self.member_count

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        description = self.description

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "org_id": org_id,
                "name": name,
                "color": color,
                "status": status,
                "members": members,
                "member_count": member_count,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.team_member import TeamMember

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        org_id = UUID(d.pop("org_id"))

        name = d.pop("name")

        color = TeamColor(d.pop("color"))

        status = TeamStatus(d.pop("status"))

        members = []
        _members = d.pop("members")
        for members_item_data in _members:
            members_item = TeamMember.from_dict(members_item_data)

            members.append(members_item)

        member_count = d.pop("member_count")

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        description = d.pop("description", UNSET)

        team = cls(
            id=id,
            org_id=org_id,
            name=name,
            color=color,
            status=status,
            members=members,
            member_count=member_count,
            created_at=created_at,
            updated_at=updated_at,
            description=description,
        )

        team.additional_properties = d
        return team

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
