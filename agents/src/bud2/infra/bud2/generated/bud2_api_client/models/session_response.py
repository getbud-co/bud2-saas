from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.accessible_organization import AccessibleOrganization
    from ..models.session_user import SessionUser


T = TypeVar("T", bound="SessionResponse")


@_attrs_define
class SessionResponse:
    """
    Attributes:
        user (SessionUser):
        organizations (list[AccessibleOrganization]):
        active_organization (AccessibleOrganization | Unset):
    """

    user: SessionUser
    organizations: list[AccessibleOrganization]
    active_organization: AccessibleOrganization | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user = self.user.to_dict()

        organizations = []
        for organizations_item_data in self.organizations:
            organizations_item = organizations_item_data.to_dict()
            organizations.append(organizations_item)

        active_organization: dict[str, Any] | Unset = UNSET
        if not isinstance(self.active_organization, Unset):
            active_organization = self.active_organization.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "user": user,
                "organizations": organizations,
            }
        )
        if active_organization is not UNSET:
            field_dict["active_organization"] = active_organization

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

        _active_organization = d.pop("active_organization", UNSET)
        active_organization: AccessibleOrganization | Unset
        if isinstance(_active_organization, Unset):
            active_organization = UNSET
        else:
            active_organization = AccessibleOrganization.from_dict(_active_organization)

        session_response = cls(
            user=user,
            organizations=organizations,
            active_organization=active_organization,
        )

        session_response.additional_properties = d
        return session_response

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
