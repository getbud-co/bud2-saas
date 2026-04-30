from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.accessible_organization_membership_role import AccessibleOrganizationMembershipRole
from ..models.accessible_organization_membership_status import AccessibleOrganizationMembershipStatus
from ..models.accessible_organization_status import AccessibleOrganizationStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="AccessibleOrganization")


@_attrs_define
class AccessibleOrganization:
    """
    Attributes:
        id (UUID):
        name (str):
        domain (str):
        workspace (str):
        status (AccessibleOrganizationStatus):
        membership_role (AccessibleOrganizationMembershipRole | Unset):
        membership_status (AccessibleOrganizationMembershipStatus | Unset):
    """

    id: UUID
    name: str
    domain: str
    workspace: str
    status: AccessibleOrganizationStatus
    membership_role: AccessibleOrganizationMembershipRole | Unset = UNSET
    membership_status: AccessibleOrganizationMembershipStatus | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        name = self.name

        domain = self.domain

        workspace = self.workspace

        status = self.status.value

        membership_role: str | Unset = UNSET
        if not isinstance(self.membership_role, Unset):
            membership_role = self.membership_role.value

        membership_status: str | Unset = UNSET
        if not isinstance(self.membership_status, Unset):
            membership_status = self.membership_status.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "domain": domain,
                "workspace": workspace,
                "status": status,
            }
        )
        if membership_role is not UNSET:
            field_dict["membership_role"] = membership_role
        if membership_status is not UNSET:
            field_dict["membership_status"] = membership_status

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        name = d.pop("name")

        domain = d.pop("domain")

        workspace = d.pop("workspace")

        status = AccessibleOrganizationStatus(d.pop("status"))

        _membership_role = d.pop("membership_role", UNSET)
        membership_role: AccessibleOrganizationMembershipRole | Unset
        if isinstance(_membership_role, Unset):
            membership_role = UNSET
        else:
            membership_role = AccessibleOrganizationMembershipRole(_membership_role)

        _membership_status = d.pop("membership_status", UNSET)
        membership_status: AccessibleOrganizationMembershipStatus | Unset
        if isinstance(_membership_status, Unset):
            membership_status = UNSET
        else:
            membership_status = AccessibleOrganizationMembershipStatus(_membership_status)

        accessible_organization = cls(
            id=id,
            name=name,
            domain=domain,
            workspace=workspace,
            status=status,
            membership_role=membership_role,
            membership_status=membership_status,
        )

        accessible_organization.additional_properties = d
        return accessible_organization

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
