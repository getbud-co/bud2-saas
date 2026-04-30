from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.team_member_input_role_in_team import TeamMemberInputRoleInTeam

T = TypeVar("T", bound="TeamMemberInput")


@_attrs_define
class TeamMemberInput:
    """
    Attributes:
        user_id (UUID):
        role_in_team (TeamMemberInputRoleInTeam):
    """

    user_id: UUID
    role_in_team: TeamMemberInputRoleInTeam
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = str(self.user_id)

        role_in_team = self.role_in_team.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "user_id": user_id,
                "role_in_team": role_in_team,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        user_id = UUID(d.pop("user_id"))

        role_in_team = TeamMemberInputRoleInTeam(d.pop("role_in_team"))

        team_member_input = cls(
            user_id=user_id,
            role_in_team=role_in_team,
        )

        team_member_input.additional_properties = d
        return team_member_input

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
