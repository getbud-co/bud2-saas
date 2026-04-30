from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.task_status import TaskStatus

T = TypeVar("T", bound="Task")


@_attrs_define
class Task:
    """
    Attributes:
        id (UUID):
        org_id (UUID):
        mission_id (UUID):
        indicator_id (None | UUID): When set, the task is nested under one of the mission's
            indicators (UI shows it inside the indicator card). When null,
            the task lives at the mission level.
        parent_task_id (None | UUID):
        team_id (None | UUID):
        contributes_to_mission_ids (list[UUID]):
        assignee_id (UUID):
        title (str):
        description (None | str):
        status (TaskStatus):
        due_date (datetime.date | None):
        completed_at (datetime.datetime | None):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
    """

    id: UUID
    org_id: UUID
    mission_id: UUID
    indicator_id: None | UUID
    parent_task_id: None | UUID
    team_id: None | UUID
    contributes_to_mission_ids: list[UUID]
    assignee_id: UUID
    title: str
    description: None | str
    status: TaskStatus
    due_date: datetime.date | None
    completed_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        org_id = str(self.org_id)

        mission_id = str(self.mission_id)

        indicator_id: None | str
        if isinstance(self.indicator_id, UUID):
            indicator_id = str(self.indicator_id)
        else:
            indicator_id = self.indicator_id

        parent_task_id: None | str
        if isinstance(self.parent_task_id, UUID):
            parent_task_id = str(self.parent_task_id)
        else:
            parent_task_id = self.parent_task_id

        team_id: None | str
        if isinstance(self.team_id, UUID):
            team_id = str(self.team_id)
        else:
            team_id = self.team_id

        contributes_to_mission_ids = []
        for contributes_to_mission_ids_item_data in self.contributes_to_mission_ids:
            contributes_to_mission_ids_item = str(contributes_to_mission_ids_item_data)
            contributes_to_mission_ids.append(contributes_to_mission_ids_item)

        assignee_id = str(self.assignee_id)

        title = self.title

        description: None | str
        description = self.description

        status = self.status.value

        due_date: None | str
        if isinstance(self.due_date, datetime.date):
            due_date = self.due_date.isoformat()
        else:
            due_date = self.due_date

        completed_at: None | str
        if isinstance(self.completed_at, datetime.datetime):
            completed_at = self.completed_at.isoformat()
        else:
            completed_at = self.completed_at

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "org_id": org_id,
                "mission_id": mission_id,
                "indicator_id": indicator_id,
                "parent_task_id": parent_task_id,
                "team_id": team_id,
                "contributes_to_mission_ids": contributes_to_mission_ids,
                "assignee_id": assignee_id,
                "title": title,
                "description": description,
                "status": status,
                "due_date": due_date,
                "completed_at": completed_at,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        org_id = UUID(d.pop("org_id"))

        mission_id = UUID(d.pop("mission_id"))

        def _parse_indicator_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                indicator_id_type_0 = UUID(data)

                return indicator_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        indicator_id = _parse_indicator_id(d.pop("indicator_id"))

        def _parse_parent_task_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                parent_task_id_type_0 = UUID(data)

                return parent_task_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        parent_task_id = _parse_parent_task_id(d.pop("parent_task_id"))

        def _parse_team_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                team_id_type_0 = UUID(data)

                return team_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        team_id = _parse_team_id(d.pop("team_id"))

        contributes_to_mission_ids = []
        _contributes_to_mission_ids = d.pop("contributes_to_mission_ids")
        for contributes_to_mission_ids_item_data in _contributes_to_mission_ids:
            contributes_to_mission_ids_item = UUID(contributes_to_mission_ids_item_data)

            contributes_to_mission_ids.append(contributes_to_mission_ids_item)

        assignee_id = UUID(d.pop("assignee_id"))

        title = d.pop("title")

        def _parse_description(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        description = _parse_description(d.pop("description"))

        status = TaskStatus(d.pop("status"))

        def _parse_due_date(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                due_date_type_0 = isoparse(data).date()

                return due_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        due_date = _parse_due_date(d.pop("due_date"))

        def _parse_completed_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                completed_at_type_0 = isoparse(data)

                return completed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        completed_at = _parse_completed_at(d.pop("completed_at"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        task = cls(
            id=id,
            org_id=org_id,
            mission_id=mission_id,
            indicator_id=indicator_id,
            parent_task_id=parent_task_id,
            team_id=team_id,
            contributes_to_mission_ids=contributes_to_mission_ids,
            assignee_id=assignee_id,
            title=title,
            description=description,
            status=status,
            due_date=due_date,
            completed_at=completed_at,
            created_at=created_at,
            updated_at=updated_at,
        )

        task.additional_properties = d
        return task

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
