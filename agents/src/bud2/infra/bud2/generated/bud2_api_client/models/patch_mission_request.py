from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.patch_mission_request_kanban_status import PatchMissionRequestKanbanStatus
from ..models.patch_mission_request_status import PatchMissionRequestStatus
from ..models.patch_mission_request_visibility import PatchMissionRequestVisibility
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.patch_mission_request_members_item import PatchMissionRequestMembersItem


T = TypeVar("T", bound="PatchMissionRequest")


@_attrs_define
class PatchMissionRequest:
    """JSON Merge Patch body. All fields are optional; only fields present in
    the request are applied to the mission. Absent fields preserve their
    existing values. `parent_id` is intentionally NOT exposed — reparent
    is not supported via this endpoint.
    Limitation: with simple pointers we cannot distinguish "field absent"
    from "field explicitly null", so sending null on a nullable field
    does NOT clear it in this iteration.

        Attributes:
            title (str | Unset):
            description (str | Unset):
            owner_id (UUID | Unset):
            team_id (UUID | Unset):
            status (PatchMissionRequestStatus | Unset):
            visibility (PatchMissionRequestVisibility | Unset):
            kanban_status (PatchMissionRequestKanbanStatus | Unset):
            start_date (datetime.date | Unset):
            end_date (datetime.date | Unset):
            members (list[PatchMissionRequestMembersItem] | Unset):
            tag_ids (list[UUID] | Unset):
    """

    title: str | Unset = UNSET
    description: str | Unset = UNSET
    owner_id: UUID | Unset = UNSET
    team_id: UUID | Unset = UNSET
    status: PatchMissionRequestStatus | Unset = UNSET
    visibility: PatchMissionRequestVisibility | Unset = UNSET
    kanban_status: PatchMissionRequestKanbanStatus | Unset = UNSET
    start_date: datetime.date | Unset = UNSET
    end_date: datetime.date | Unset = UNSET
    members: list[PatchMissionRequestMembersItem] | Unset = UNSET
    tag_ids: list[UUID] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        title = self.title

        description = self.description

        owner_id: str | Unset = UNSET
        if not isinstance(self.owner_id, Unset):
            owner_id = str(self.owner_id)

        team_id: str | Unset = UNSET
        if not isinstance(self.team_id, Unset):
            team_id = str(self.team_id)

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        visibility: str | Unset = UNSET
        if not isinstance(self.visibility, Unset):
            visibility = self.visibility.value

        kanban_status: str | Unset = UNSET
        if not isinstance(self.kanban_status, Unset):
            kanban_status = self.kanban_status.value

        start_date: str | Unset = UNSET
        if not isinstance(self.start_date, Unset):
            start_date = self.start_date.isoformat()

        end_date: str | Unset = UNSET
        if not isinstance(self.end_date, Unset):
            end_date = self.end_date.isoformat()

        members: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.members, Unset):
            members = []
            for members_item_data in self.members:
                members_item = members_item_data.to_dict()
                members.append(members_item)

        tag_ids: list[str] | Unset = UNSET
        if not isinstance(self.tag_ids, Unset):
            tag_ids = []
            for tag_ids_item_data in self.tag_ids:
                tag_ids_item = str(tag_ids_item_data)
                tag_ids.append(tag_ids_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if title is not UNSET:
            field_dict["title"] = title
        if description is not UNSET:
            field_dict["description"] = description
        if owner_id is not UNSET:
            field_dict["owner_id"] = owner_id
        if team_id is not UNSET:
            field_dict["team_id"] = team_id
        if status is not UNSET:
            field_dict["status"] = status
        if visibility is not UNSET:
            field_dict["visibility"] = visibility
        if kanban_status is not UNSET:
            field_dict["kanban_status"] = kanban_status
        if start_date is not UNSET:
            field_dict["start_date"] = start_date
        if end_date is not UNSET:
            field_dict["end_date"] = end_date
        if members is not UNSET:
            field_dict["members"] = members
        if tag_ids is not UNSET:
            field_dict["tag_ids"] = tag_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.patch_mission_request_members_item import PatchMissionRequestMembersItem

        d = dict(src_dict)
        title = d.pop("title", UNSET)

        description = d.pop("description", UNSET)

        _owner_id = d.pop("owner_id", UNSET)
        owner_id: UUID | Unset
        if isinstance(_owner_id, Unset):
            owner_id = UNSET
        else:
            owner_id = UUID(_owner_id)

        _team_id = d.pop("team_id", UNSET)
        team_id: UUID | Unset
        if isinstance(_team_id, Unset):
            team_id = UNSET
        else:
            team_id = UUID(_team_id)

        _status = d.pop("status", UNSET)
        status: PatchMissionRequestStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = PatchMissionRequestStatus(_status)

        _visibility = d.pop("visibility", UNSET)
        visibility: PatchMissionRequestVisibility | Unset
        if isinstance(_visibility, Unset):
            visibility = UNSET
        else:
            visibility = PatchMissionRequestVisibility(_visibility)

        _kanban_status = d.pop("kanban_status", UNSET)
        kanban_status: PatchMissionRequestKanbanStatus | Unset
        if isinstance(_kanban_status, Unset):
            kanban_status = UNSET
        else:
            kanban_status = PatchMissionRequestKanbanStatus(_kanban_status)

        _start_date = d.pop("start_date", UNSET)
        start_date: datetime.date | Unset
        if isinstance(_start_date, Unset):
            start_date = UNSET
        else:
            start_date = isoparse(_start_date).date()

        _end_date = d.pop("end_date", UNSET)
        end_date: datetime.date | Unset
        if isinstance(_end_date, Unset):
            end_date = UNSET
        else:
            end_date = isoparse(_end_date).date()

        _members = d.pop("members", UNSET)
        members: list[PatchMissionRequestMembersItem] | Unset = UNSET
        if _members is not UNSET:
            members = []
            for members_item_data in _members:
                members_item = PatchMissionRequestMembersItem.from_dict(members_item_data)

                members.append(members_item)

        _tag_ids = d.pop("tag_ids", UNSET)
        tag_ids: list[UUID] | Unset = UNSET
        if _tag_ids is not UNSET:
            tag_ids = []
            for tag_ids_item_data in _tag_ids:
                tag_ids_item = UUID(tag_ids_item_data)

                tag_ids.append(tag_ids_item)

        patch_mission_request = cls(
            title=title,
            description=description,
            owner_id=owner_id,
            team_id=team_id,
            status=status,
            visibility=visibility,
            kanban_status=kanban_status,
            start_date=start_date,
            end_date=end_date,
            members=members,
            tag_ids=tag_ids,
        )

        patch_mission_request.additional_properties = d
        return patch_mission_request

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
