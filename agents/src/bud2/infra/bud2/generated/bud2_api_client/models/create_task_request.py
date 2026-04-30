from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.create_task_request_status import CreateTaskRequestStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateTaskRequest")


@_attrs_define
class CreateTaskRequest:
    """
    Attributes:
        mission_id (UUID):
        assignee_id (UUID):
        title (str):
        indicator_id (None | Unset | UUID): Optional. When set, the task is nested under the indicator;
            the indicator must belong to the same mission.
        parent_task_id (None | Unset | UUID):
        team_id (None | Unset | UUID):
        contributes_to_mission_ids (list[UUID] | Unset):
        description (None | str | Unset):
        status (CreateTaskRequestStatus | Unset):
        due_date (datetime.date | None | Unset):
    """

    mission_id: UUID
    assignee_id: UUID
    title: str
    indicator_id: None | Unset | UUID = UNSET
    parent_task_id: None | Unset | UUID = UNSET
    team_id: None | Unset | UUID = UNSET
    contributes_to_mission_ids: list[UUID] | Unset = UNSET
    description: None | str | Unset = UNSET
    status: CreateTaskRequestStatus | Unset = UNSET
    due_date: datetime.date | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        mission_id = str(self.mission_id)

        assignee_id = str(self.assignee_id)

        title = self.title

        indicator_id: None | str | Unset
        if isinstance(self.indicator_id, Unset):
            indicator_id = UNSET
        elif isinstance(self.indicator_id, UUID):
            indicator_id = str(self.indicator_id)
        else:
            indicator_id = self.indicator_id

        parent_task_id: None | str | Unset
        if isinstance(self.parent_task_id, Unset):
            parent_task_id = UNSET
        elif isinstance(self.parent_task_id, UUID):
            parent_task_id = str(self.parent_task_id)
        else:
            parent_task_id = self.parent_task_id

        team_id: None | str | Unset
        if isinstance(self.team_id, Unset):
            team_id = UNSET
        elif isinstance(self.team_id, UUID):
            team_id = str(self.team_id)
        else:
            team_id = self.team_id

        contributes_to_mission_ids: list[str] | Unset = UNSET
        if not isinstance(self.contributes_to_mission_ids, Unset):
            contributes_to_mission_ids = []
            for contributes_to_mission_ids_item_data in self.contributes_to_mission_ids:
                contributes_to_mission_ids_item = str(contributes_to_mission_ids_item_data)
                contributes_to_mission_ids.append(contributes_to_mission_ids_item)

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        due_date: None | str | Unset
        if isinstance(self.due_date, Unset):
            due_date = UNSET
        elif isinstance(self.due_date, datetime.date):
            due_date = self.due_date.isoformat()
        else:
            due_date = self.due_date

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "mission_id": mission_id,
                "assignee_id": assignee_id,
                "title": title,
            }
        )
        if indicator_id is not UNSET:
            field_dict["indicator_id"] = indicator_id
        if parent_task_id is not UNSET:
            field_dict["parent_task_id"] = parent_task_id
        if team_id is not UNSET:
            field_dict["team_id"] = team_id
        if contributes_to_mission_ids is not UNSET:
            field_dict["contributes_to_mission_ids"] = contributes_to_mission_ids
        if description is not UNSET:
            field_dict["description"] = description
        if status is not UNSET:
            field_dict["status"] = status
        if due_date is not UNSET:
            field_dict["due_date"] = due_date

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        mission_id = UUID(d.pop("mission_id"))

        assignee_id = UUID(d.pop("assignee_id"))

        title = d.pop("title")

        def _parse_indicator_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                indicator_id_type_0 = UUID(data)

                return indicator_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        indicator_id = _parse_indicator_id(d.pop("indicator_id", UNSET))

        def _parse_parent_task_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                parent_task_id_type_0 = UUID(data)

                return parent_task_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        parent_task_id = _parse_parent_task_id(d.pop("parent_task_id", UNSET))

        def _parse_team_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                team_id_type_0 = UUID(data)

                return team_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        team_id = _parse_team_id(d.pop("team_id", UNSET))

        _contributes_to_mission_ids = d.pop("contributes_to_mission_ids", UNSET)
        contributes_to_mission_ids: list[UUID] | Unset = UNSET
        if _contributes_to_mission_ids is not UNSET:
            contributes_to_mission_ids = []
            for contributes_to_mission_ids_item_data in _contributes_to_mission_ids:
                contributes_to_mission_ids_item = UUID(contributes_to_mission_ids_item_data)

                contributes_to_mission_ids.append(contributes_to_mission_ids_item)

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        _status = d.pop("status", UNSET)
        status: CreateTaskRequestStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = CreateTaskRequestStatus(_status)

        def _parse_due_date(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                due_date_type_0 = isoparse(data).date()

                return due_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        due_date = _parse_due_date(d.pop("due_date", UNSET))

        create_task_request = cls(
            mission_id=mission_id,
            assignee_id=assignee_id,
            title=title,
            indicator_id=indicator_id,
            parent_task_id=parent_task_id,
            team_id=team_id,
            contributes_to_mission_ids=contributes_to_mission_ids,
            description=description,
            status=status,
            due_date=due_date,
        )

        create_task_request.additional_properties = d
        return create_task_request

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
