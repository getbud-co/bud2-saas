from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.update_organization_request_status import UpdateOrganizationRequestStatus

T = TypeVar("T", bound="UpdateOrganizationRequest")


@_attrs_define
class UpdateOrganizationRequest:
    """
    Attributes:
        name (str):
        domain (str):
        workspace (str):
        status (UpdateOrganizationRequestStatus):
    """

    name: str
    domain: str
    workspace: str
    status: UpdateOrganizationRequestStatus
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        domain = self.domain

        workspace = self.workspace

        status = self.status.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "domain": domain,
                "workspace": workspace,
                "status": status,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        domain = d.pop("domain")

        workspace = d.pop("workspace")

        status = UpdateOrganizationRequestStatus(d.pop("status"))

        update_organization_request = cls(
            name=name,
            domain=domain,
            workspace=workspace,
            status=status,
        )

        update_organization_request.additional_properties = d
        return update_organization_request

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
