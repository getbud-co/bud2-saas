from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.team_member_role_in_team import TeamMemberRoleInTeam
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.team_member_user import TeamMemberUser


T = TypeVar("T", bound="TeamMember")


@_attrs_define
class TeamMember:
    """
    Attributes:
        team_id (UUID):
        user_id (UUID):
        role_in_team (TeamMemberRoleInTeam):
        joined_at (datetime.datetime):
        user (TeamMemberUser | Unset):
    """

    team_id: UUID
    user_id: UUID
    role_in_team: TeamMemberRoleInTeam
    joined_at: datetime.datetime
    user: TeamMemberUser | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        team_id = str(self.team_id)

        user_id = str(self.user_id)

        role_in_team = self.role_in_team.value

        joined_at = self.joined_at.isoformat()

        user: dict[str, Any] | Unset = UNSET
        if not isinstance(self.user, Unset):
            user = self.user.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "team_id": team_id,
                "user_id": user_id,
                "role_in_team": role_in_team,
                "joined_at": joined_at,
            }
        )
        if user is not UNSET:
            field_dict["user"] = user

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.team_member_user import TeamMemberUser

        d = dict(src_dict)
        team_id = UUID(d.pop("team_id"))

        user_id = UUID(d.pop("user_id"))

        role_in_team = TeamMemberRoleInTeam(d.pop("role_in_team"))

        joined_at = isoparse(d.pop("joined_at"))

        _user = d.pop("user", UNSET)
        user: TeamMemberUser | Unset
        if isinstance(_user, Unset):
            user = UNSET
        else:
            user = TeamMemberUser.from_dict(_user)

        team_member = cls(
            team_id=team_id,
            user_id=user_id,
            role_in_team=role_in_team,
            joined_at=joined_at,
            user=user,
        )

        team_member.additional_properties = d
        return team_member

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
