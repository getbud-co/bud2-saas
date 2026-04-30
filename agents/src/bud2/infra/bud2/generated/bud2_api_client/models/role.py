from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.role_scope import RoleScope
from ..models.role_type import RoleType
from ..types import UNSET, Unset

T = TypeVar("T", bound="Role")


@_attrs_define
class Role:
    """
    Attributes:
        id (UUID):
        slug (str):
        name (str):
        type_ (RoleType):
        scope (RoleScope):
        is_default (bool):
        permission_ids (list[str]):
        users_count (int):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        description (None | str | Unset):
    """

    id: UUID
    slug: str
    name: str
    type_: RoleType
    scope: RoleScope
    is_default: bool
    permission_ids: list[str]
    users_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    description: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        slug = self.slug

        name = self.name

        type_ = self.type_.value

        scope = self.scope.value

        is_default = self.is_default

        permission_ids = self.permission_ids

        users_count = self.users_count

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "slug": slug,
                "name": name,
                "type": type_,
                "scope": scope,
                "is_default": is_default,
                "permission_ids": permission_ids,
                "users_count": users_count,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        slug = d.pop("slug")

        name = d.pop("name")

        type_ = RoleType(d.pop("type"))

        scope = RoleScope(d.pop("scope"))

        is_default = d.pop("is_default")

        permission_ids = cast(list[str], d.pop("permission_ids"))

        users_count = d.pop("users_count")

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        role = cls(
            id=id,
            slug=slug,
            name=name,
            type_=type_,
            scope=scope,
            is_default=is_default,
            permission_ids=permission_ids,
            users_count=users_count,
            created_at=created_at,
            updated_at=updated_at,
            description=description,
        )

        role.additional_properties = d
        return role

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
