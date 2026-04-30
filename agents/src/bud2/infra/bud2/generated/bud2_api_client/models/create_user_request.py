from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.create_user_request_gender import CreateUserRequestGender
from ..models.create_user_request_role import CreateUserRequestRole
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateUserRequest")


@_attrs_define
class CreateUserRequest:
    """
    Attributes:
        first_name (str):
        last_name (str):
        email (str):
        password (str):
        role (CreateUserRequestRole):
        nickname (str | Unset):
        job_title (str | Unset):
        birth_date (datetime.date | Unset):
        language (str | Unset):
        gender (CreateUserRequestGender | Unset):
        phone (str | Unset):
        team_ids (list[UUID] | Unset):
    """

    first_name: str
    last_name: str
    email: str
    password: str
    role: CreateUserRequestRole
    nickname: str | Unset = UNSET
    job_title: str | Unset = UNSET
    birth_date: datetime.date | Unset = UNSET
    language: str | Unset = UNSET
    gender: CreateUserRequestGender | Unset = UNSET
    phone: str | Unset = UNSET
    team_ids: list[UUID] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        first_name = self.first_name

        last_name = self.last_name

        email = self.email

        password = self.password

        role = self.role.value

        nickname = self.nickname

        job_title = self.job_title

        birth_date: str | Unset = UNSET
        if not isinstance(self.birth_date, Unset):
            birth_date = self.birth_date.isoformat()

        language = self.language

        gender: str | Unset = UNSET
        if not isinstance(self.gender, Unset):
            gender = self.gender.value

        phone = self.phone

        team_ids: list[str] | Unset = UNSET
        if not isinstance(self.team_ids, Unset):
            team_ids = []
            for team_ids_item_data in self.team_ids:
                team_ids_item = str(team_ids_item_data)
                team_ids.append(team_ids_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "password": password,
                "role": role,
            }
        )
        if nickname is not UNSET:
            field_dict["nickname"] = nickname
        if job_title is not UNSET:
            field_dict["job_title"] = job_title
        if birth_date is not UNSET:
            field_dict["birth_date"] = birth_date
        if language is not UNSET:
            field_dict["language"] = language
        if gender is not UNSET:
            field_dict["gender"] = gender
        if phone is not UNSET:
            field_dict["phone"] = phone
        if team_ids is not UNSET:
            field_dict["team_ids"] = team_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        first_name = d.pop("first_name")

        last_name = d.pop("last_name")

        email = d.pop("email")

        password = d.pop("password")

        role = CreateUserRequestRole(d.pop("role"))

        nickname = d.pop("nickname", UNSET)

        job_title = d.pop("job_title", UNSET)

        _birth_date = d.pop("birth_date", UNSET)
        birth_date: datetime.date | Unset
        if isinstance(_birth_date, Unset):
            birth_date = UNSET
        else:
            birth_date = isoparse(_birth_date).date()

        language = d.pop("language", UNSET)

        _gender = d.pop("gender", UNSET)
        gender: CreateUserRequestGender | Unset
        if isinstance(_gender, Unset):
            gender = UNSET
        else:
            gender = CreateUserRequestGender(_gender)

        phone = d.pop("phone", UNSET)

        _team_ids = d.pop("team_ids", UNSET)
        team_ids: list[UUID] | Unset = UNSET
        if _team_ids is not UNSET:
            team_ids = []
            for team_ids_item_data in _team_ids:
                team_ids_item = UUID(team_ids_item_data)

                team_ids.append(team_ids_item)

        create_user_request = cls(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=password,
            role=role,
            nickname=nickname,
            job_title=job_title,
            birth_date=birth_date,
            language=language,
            gender=gender,
            phone=phone,
            team_ids=team_ids,
        )

        create_user_request.additional_properties = d
        return create_user_request

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
