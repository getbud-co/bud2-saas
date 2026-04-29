from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.user_gender import UserGender
from ..models.user_membership_status import UserMembershipStatus
from ..models.user_role import UserRole
from ..models.user_status import UserStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="User")


@_attrs_define
class User:
    """
    Attributes:
        id (UUID):
        first_name (str):
        last_name (str):
        email (str):
        status (UserStatus):
        is_system_admin (bool):
        language (str):
        team_ids (list[UUID]):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        nickname (str | Unset):
        job_title (str | Unset):
        birth_date (datetime.date | Unset):
        gender (UserGender | Unset):
        phone (str | Unset):
        role (UserRole | Unset):
        membership_status (UserMembershipStatus | Unset):
    """

    id: UUID
    first_name: str
    last_name: str
    email: str
    status: UserStatus
    is_system_admin: bool
    language: str
    team_ids: list[UUID]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    nickname: str | Unset = UNSET
    job_title: str | Unset = UNSET
    birth_date: datetime.date | Unset = UNSET
    gender: UserGender | Unset = UNSET
    phone: str | Unset = UNSET
    role: UserRole | Unset = UNSET
    membership_status: UserMembershipStatus | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        first_name = self.first_name

        last_name = self.last_name

        email = self.email

        status = self.status.value

        is_system_admin = self.is_system_admin

        language = self.language

        team_ids = []
        for team_ids_item_data in self.team_ids:
            team_ids_item = str(team_ids_item_data)
            team_ids.append(team_ids_item)

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        nickname = self.nickname

        job_title = self.job_title

        birth_date: str | Unset = UNSET
        if not isinstance(self.birth_date, Unset):
            birth_date = self.birth_date.isoformat()

        gender: str | Unset = UNSET
        if not isinstance(self.gender, Unset):
            gender = self.gender.value

        phone = self.phone

        role: str | Unset = UNSET
        if not isinstance(self.role, Unset):
            role = self.role.value

        membership_status: str | Unset = UNSET
        if not isinstance(self.membership_status, Unset):
            membership_status = self.membership_status.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "status": status,
                "is_system_admin": is_system_admin,
                "language": language,
                "team_ids": team_ids,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if nickname is not UNSET:
            field_dict["nickname"] = nickname
        if job_title is not UNSET:
            field_dict["job_title"] = job_title
        if birth_date is not UNSET:
            field_dict["birth_date"] = birth_date
        if gender is not UNSET:
            field_dict["gender"] = gender
        if phone is not UNSET:
            field_dict["phone"] = phone
        if role is not UNSET:
            field_dict["role"] = role
        if membership_status is not UNSET:
            field_dict["membership_status"] = membership_status

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        first_name = d.pop("first_name")

        last_name = d.pop("last_name")

        email = d.pop("email")

        status = UserStatus(d.pop("status"))

        is_system_admin = d.pop("is_system_admin")

        language = d.pop("language")

        team_ids = []
        _team_ids = d.pop("team_ids")
        for team_ids_item_data in _team_ids:
            team_ids_item = UUID(team_ids_item_data)

            team_ids.append(team_ids_item)

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        nickname = d.pop("nickname", UNSET)

        job_title = d.pop("job_title", UNSET)

        _birth_date = d.pop("birth_date", UNSET)
        birth_date: datetime.date | Unset
        if isinstance(_birth_date, Unset):
            birth_date = UNSET
        else:
            birth_date = isoparse(_birth_date).date()

        _gender = d.pop("gender", UNSET)
        gender: UserGender | Unset
        if isinstance(_gender, Unset):
            gender = UNSET
        else:
            gender = UserGender(_gender)

        phone = d.pop("phone", UNSET)

        _role = d.pop("role", UNSET)
        role: UserRole | Unset
        if isinstance(_role, Unset):
            role = UNSET
        else:
            role = UserRole(_role)

        _membership_status = d.pop("membership_status", UNSET)
        membership_status: UserMembershipStatus | Unset
        if isinstance(_membership_status, Unset):
            membership_status = UNSET
        else:
            membership_status = UserMembershipStatus(_membership_status)

        user = cls(
            id=id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            status=status,
            is_system_admin=is_system_admin,
            language=language,
            team_ids=team_ids,
            created_at=created_at,
            updated_at=updated_at,
            nickname=nickname,
            job_title=job_title,
            birth_date=birth_date,
            gender=gender,
            phone=phone,
            role=role,
            membership_status=membership_status,
        )

        user.additional_properties = d
        return user

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
