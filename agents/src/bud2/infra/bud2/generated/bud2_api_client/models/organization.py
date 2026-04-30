from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.organization_status import OrganizationStatus

T = TypeVar("T", bound="Organization")


@_attrs_define
class Organization:
    """
    Attributes:
        id (UUID):
        name (str):
        domain (str):
        workspace (str):
        status (OrganizationStatus):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
    """

    id: UUID
    name: str
    domain: str
    workspace: str
    status: OrganizationStatus
    created_at: datetime.datetime
    updated_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        name = self.name

        domain = self.domain

        workspace = self.workspace

        status = self.status.value

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "domain": domain,
                "workspace": workspace,
                "status": status,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        name = d.pop("name")

        domain = d.pop("domain")

        workspace = d.pop("workspace")

        status = OrganizationStatus(d.pop("status"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        organization = cls(
            id=id,
            name=name,
            domain=domain,
            workspace=workspace,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
        )

        organization.additional_properties = d
        return organization

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
