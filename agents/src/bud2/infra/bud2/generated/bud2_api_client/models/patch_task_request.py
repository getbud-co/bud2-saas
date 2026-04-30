from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.patch_task_request_status import PatchTaskRequestStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchTaskRequest")


@_attrs_define
class PatchTaskRequest:
    """JSON Merge Patch body. All fields are optional; only fields present in
    the request are applied. `mission_id` is intentionally NOT exposed.
    `indicator_id` can be set to re-assign the task within the same
    mission; clearing it (moving back to the mission root) requires a
    future endpoint that supports null/absent distinction.
    completed_at is managed by the server based on status transitions.

        Attributes:
            title (str | Unset):
            description (str | Unset):
            indicator_id (UUID | Unset):
            assignee_id (UUID | Unset):
            team_id (UUID | Unset):
            contributes_to_mission_ids (list[UUID] | Unset):
            status (PatchTaskRequestStatus | Unset):
            due_date (datetime.date | Unset):
    """

    title: str | Unset = UNSET
    description: str | Unset = UNSET
    indicator_id: UUID | Unset = UNSET
    assignee_id: UUID | Unset = UNSET
    team_id: UUID | Unset = UNSET
    contributes_to_mission_ids: list[UUID] | Unset = UNSET
    status: PatchTaskRequestStatus | Unset = UNSET
    due_date: datetime.date | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        title = self.title

        description = self.description

        indicator_id: str | Unset = UNSET
        if not isinstance(self.indicator_id, Unset):
            indicator_id = str(self.indicator_id)

        assignee_id: str | Unset = UNSET
        if not isinstance(self.assignee_id, Unset):
            assignee_id = str(self.assignee_id)

        team_id: str | Unset = UNSET
        if not isinstance(self.team_id, Unset):
            team_id = str(self.team_id)

        contributes_to_mission_ids: list[str] | Unset = UNSET
        if not isinstance(self.contributes_to_mission_ids, Unset):
            contributes_to_mission_ids = []
            for contributes_to_mission_ids_item_data in self.contributes_to_mission_ids:
                contributes_to_mission_ids_item = str(contributes_to_mission_ids_item_data)
                contributes_to_mission_ids.append(contributes_to_mission_ids_item)

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        due_date: str | Unset = UNSET
        if not isinstance(self.due_date, Unset):
            due_date = self.due_date.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if title is not UNSET:
            field_dict["title"] = title
        if description is not UNSET:
            field_dict["description"] = description
        if indicator_id is not UNSET:
            field_dict["indicator_id"] = indicator_id
        if assignee_id is not UNSET:
            field_dict["assignee_id"] = assignee_id
        if team_id is not UNSET:
            field_dict["team_id"] = team_id
        if contributes_to_mission_ids is not UNSET:
            field_dict["contributes_to_mission_ids"] = contributes_to_mission_ids
        if status is not UNSET:
            field_dict["status"] = status
        if due_date is not UNSET:
            field_dict["due_date"] = due_date

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        title = d.pop("title", UNSET)

        description = d.pop("description", UNSET)

        _indicator_id = d.pop("indicator_id", UNSET)
        indicator_id: UUID | Unset
        if isinstance(_indicator_id, Unset):
            indicator_id = UNSET
        else:
            indicator_id = UUID(_indicator_id)

        _assignee_id = d.pop("assignee_id", UNSET)
        assignee_id: UUID | Unset
        if isinstance(_assignee_id, Unset):
            assignee_id = UNSET
        else:
            assignee_id = UUID(_assignee_id)

        _team_id = d.pop("team_id", UNSET)
        team_id: UUID | Unset
        if isinstance(_team_id, Unset):
            team_id = UNSET
        else:
            team_id = UUID(_team_id)

        _contributes_to_mission_ids = d.pop("contributes_to_mission_ids", UNSET)
        contributes_to_mission_ids: list[UUID] | Unset = UNSET
        if _contributes_to_mission_ids is not UNSET:
            contributes_to_mission_ids = []
            for contributes_to_mission_ids_item_data in _contributes_to_mission_ids:
                contributes_to_mission_ids_item = UUID(contributes_to_mission_ids_item_data)

                contributes_to_mission_ids.append(contributes_to_mission_ids_item)

        _status = d.pop("status", UNSET)
        status: PatchTaskRequestStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = PatchTaskRequestStatus(_status)

        _due_date = d.pop("due_date", UNSET)
        due_date: datetime.date | Unset
        if isinstance(_due_date, Unset):
            due_date = UNSET
        else:
            due_date = isoparse(_due_date).date()

        patch_task_request = cls(
            title=title,
            description=description,
            indicator_id=indicator_id,
            assignee_id=assignee_id,
            team_id=team_id,
            contributes_to_mission_ids=contributes_to_mission_ids,
            status=status,
            due_date=due_date,
        )

        patch_task_request.additional_properties = d
        return patch_task_request

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
