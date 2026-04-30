from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.bootstrap_response_admin import BootstrapResponseAdmin
    from ..models.bootstrap_response_organization import BootstrapResponseOrganization


T = TypeVar("T", bound="BootstrapResponse")


@_attrs_define
class BootstrapResponse:
    """
    Attributes:
        access_token (str):
        token_type (str):
        organization (BootstrapResponseOrganization):
        admin (BootstrapResponseAdmin):
    """

    access_token: str
    token_type: str
    organization: BootstrapResponseOrganization
    admin: BootstrapResponseAdmin
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        access_token = self.access_token

        token_type = self.token_type

        organization = self.organization.to_dict()

        admin = self.admin.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "access_token": access_token,
                "token_type": token_type,
                "organization": organization,
                "admin": admin,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bootstrap_response_admin import BootstrapResponseAdmin
        from ..models.bootstrap_response_organization import BootstrapResponseOrganization

        d = dict(src_dict)
        access_token = d.pop("access_token")

        token_type = d.pop("token_type")

        organization = BootstrapResponseOrganization.from_dict(d.pop("organization"))

        admin = BootstrapResponseAdmin.from_dict(d.pop("admin"))

        bootstrap_response = cls(
            access_token=access_token,
            token_type=token_type,
            organization=organization,
            admin=admin,
        )

        bootstrap_response.additional_properties = d
        return bootstrap_response

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
