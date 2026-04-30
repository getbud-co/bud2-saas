from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="TeamMemberUser")


@_attrs_define
class TeamMemberUser:
    """
    Attributes:
        id (UUID):
        first_name (str):
        last_name (str):
        initials (str | Unset):
        job_title (str | Unset):
        avatar_url (str | Unset):
    """

    id: UUID
    first_name: str
    last_name: str
    initials: str | Unset = UNSET
    job_title: str | Unset = UNSET
    avatar_url: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        first_name = self.first_name

        last_name = self.last_name

        initials = self.initials

        job_title = self.job_title

        avatar_url = self.avatar_url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "first_name": first_name,
                "last_name": last_name,
            }
        )
        if initials is not UNSET:
            field_dict["initials"] = initials
        if job_title is not UNSET:
            field_dict["job_title"] = job_title
        if avatar_url is not UNSET:
            field_dict["avatar_url"] = avatar_url

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        first_name = d.pop("first_name")

        last_name = d.pop("last_name")

        initials = d.pop("initials", UNSET)

        job_title = d.pop("job_title", UNSET)

        avatar_url = d.pop("avatar_url", UNSET)

        team_member_user = cls(
            id=id,
            first_name=first_name,
            last_name=last_name,
            initials=initials,
            job_title=job_title,
            avatar_url=avatar_url,
        )

        team_member_user.additional_properties = d
        return team_member_user

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
