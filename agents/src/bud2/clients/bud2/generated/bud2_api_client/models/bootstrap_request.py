from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="BootstrapRequest")


@_attrs_define
class BootstrapRequest:
    """
    Attributes:
        organization_name (str):
        organization_domain (str):
        organization_workspace (str):
        admin_first_name (str):
        admin_last_name (str):
        admin_email (str):
        admin_password (str):
    """

    organization_name: str
    organization_domain: str
    organization_workspace: str
    admin_first_name: str
    admin_last_name: str
    admin_email: str
    admin_password: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        organization_name = self.organization_name

        organization_domain = self.organization_domain

        organization_workspace = self.organization_workspace

        admin_first_name = self.admin_first_name

        admin_last_name = self.admin_last_name

        admin_email = self.admin_email

        admin_password = self.admin_password

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "organization_name": organization_name,
                "organization_domain": organization_domain,
                "organization_workspace": organization_workspace,
                "admin_first_name": admin_first_name,
                "admin_last_name": admin_last_name,
                "admin_email": admin_email,
                "admin_password": admin_password,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        organization_name = d.pop("organization_name")

        organization_domain = d.pop("organization_domain")

        organization_workspace = d.pop("organization_workspace")

        admin_first_name = d.pop("admin_first_name")

        admin_last_name = d.pop("admin_last_name")

        admin_email = d.pop("admin_email")

        admin_password = d.pop("admin_password")

        bootstrap_request = cls(
            organization_name=organization_name,
            organization_domain=organization_domain,
            organization_workspace=organization_workspace,
            admin_first_name=admin_first_name,
            admin_last_name=admin_last_name,
            admin_email=admin_email,
            admin_password=admin_password,
        )

        bootstrap_request.additional_properties = d
        return bootstrap_request

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
