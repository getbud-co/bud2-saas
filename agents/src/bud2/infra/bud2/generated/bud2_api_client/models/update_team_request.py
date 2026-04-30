from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.update_team_request_color import UpdateTeamRequestColor
from ..models.update_team_request_status import UpdateTeamRequestStatus
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.team_member_input import TeamMemberInput


T = TypeVar("T", bound="UpdateTeamRequest")


@_attrs_define
class UpdateTeamRequest:
    """
    Attributes:
        name (str):
        color (UpdateTeamRequestColor):
        status (UpdateTeamRequestStatus):
        description (str | Unset):
        members (list[TeamMemberInput] | Unset):
    """

    name: str
    color: UpdateTeamRequestColor
    status: UpdateTeamRequestStatus
    description: str | Unset = UNSET
    members: list[TeamMemberInput] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        color = self.color.value

        status = self.status.value

        description = self.description

        members: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.members, Unset):
            members = []
            for members_item_data in self.members:
                members_item = members_item_data.to_dict()
                members.append(members_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "color": color,
                "status": status,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if members is not UNSET:
            field_dict["members"] = members

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.team_member_input import TeamMemberInput

        d = dict(src_dict)
        name = d.pop("name")

        color = UpdateTeamRequestColor(d.pop("color"))

        status = UpdateTeamRequestStatus(d.pop("status"))

        description = d.pop("description", UNSET)

        _members = d.pop("members", UNSET)
        members: list[TeamMemberInput] | Unset = UNSET
        if _members is not UNSET:
            members = []
            for members_item_data in _members:
                members_item = TeamMemberInput.from_dict(members_item_data)

                members.append(members_item)

        update_team_request = cls(
            name=name,
            color=color,
            status=status,
            description=description,
            members=members,
        )

        update_team_request.additional_properties = d
        return update_team_request

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
