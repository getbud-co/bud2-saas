from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.accessible_organization import AccessibleOrganization
    from ..models.session_user import SessionUser


T = TypeVar("T", bound="AuthResponse")


@_attrs_define
class AuthResponse:
    """
    Attributes:
        user (SessionUser):
        organizations (list[AccessibleOrganization]):
        access_token (str):
        token_type (str):  Example: Bearer.
        active_organization (AccessibleOrganization | Unset):
        refresh_token (str | Unset):
    """

    user: SessionUser
    organizations: list[AccessibleOrganization]
    access_token: str
    token_type: str
    active_organization: AccessibleOrganization | Unset = UNSET
    refresh_token: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user = self.user.to_dict()

        organizations = []
        for organizations_item_data in self.organizations:
            organizations_item = organizations_item_data.to_dict()
            organizations.append(organizations_item)

        access_token = self.access_token

        token_type = self.token_type

        active_organization: dict[str, Any] | Unset = UNSET
        if not isinstance(self.active_organization, Unset):
            active_organization = self.active_organization.to_dict()

        refresh_token = self.refresh_token

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "user": user,
                "organizations": organizations,
                "access_token": access_token,
                "token_type": token_type,
            }
        )
        if active_organization is not UNSET:
            field_dict["active_organization"] = active_organization
        if refresh_token is not UNSET:
            field_dict["refresh_token"] = refresh_token

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.accessible_organization import AccessibleOrganization
        from ..models.session_user import SessionUser

        d = dict(src_dict)
        user = SessionUser.from_dict(d.pop("user"))

        organizations = []
        _organizations = d.pop("organizations")
        for organizations_item_data in _organizations:
            organizations_item = AccessibleOrganization.from_dict(organizations_item_data)

            organizations.append(organizations_item)

        access_token = d.pop("access_token")

        token_type = d.pop("token_type")

        _active_organization = d.pop("active_organization", UNSET)
        active_organization: AccessibleOrganization | Unset
        if isinstance(_active_organization, Unset):
            active_organization = UNSET
        else:
            active_organization = AccessibleOrganization.from_dict(_active_organization)

        refresh_token = d.pop("refresh_token", UNSET)

        auth_response = cls(
            user=user,
            organizations=organizations,
            access_token=access_token,
            token_type=token_type,
            active_organization=active_organization,
            refresh_token=refresh_token,
        )

        auth_response.additional_properties = d
        return auth_response

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
