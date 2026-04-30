from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.create_mission_task_inline_status import CreateMissionTaskInlineStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateMissionTaskInline")


@_attrs_define
class CreateMissionTaskInline:
    """Task created inline with its parent mission. mission_id is supplied
    by the parent. The task may be nested under one of the inline
    indicators (use indicator_index, the position in the parent
    request's indicators array) or under an existing indicator
    already on the server (indicator_id). The two are mutually
    exclusive; both null means the task lives at the mission level.

        Attributes:
            title (str):
            assignee_id (None | Unset | UUID):
            indicator_id (None | Unset | UUID):
            indicator_index (int | None | Unset):
            description (None | str | Unset):
            status (CreateMissionTaskInlineStatus | Unset):
            due_date (datetime.date | None | Unset):
    """

    title: str
    assignee_id: None | Unset | UUID = UNSET
    indicator_id: None | Unset | UUID = UNSET
    indicator_index: int | None | Unset = UNSET
    description: None | str | Unset = UNSET
    status: CreateMissionTaskInlineStatus | Unset = UNSET
    due_date: datetime.date | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        title = self.title

        assignee_id: None | str | Unset
        if isinstance(self.assignee_id, Unset):
            assignee_id = UNSET
        elif isinstance(self.assignee_id, UUID):
            assignee_id = str(self.assignee_id)
        else:
            assignee_id = self.assignee_id

        indicator_id: None | str | Unset
        if isinstance(self.indicator_id, Unset):
            indicator_id = UNSET
        elif isinstance(self.indicator_id, UUID):
            indicator_id = str(self.indicator_id)
        else:
            indicator_id = self.indicator_id

        indicator_index: int | None | Unset
        if isinstance(self.indicator_index, Unset):
            indicator_index = UNSET
        else:
            indicator_index = self.indicator_index

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
                "title": title,
            }
        )
        if assignee_id is not UNSET:
            field_dict["assignee_id"] = assignee_id
        if indicator_id is not UNSET:
            field_dict["indicator_id"] = indicator_id
        if indicator_index is not UNSET:
            field_dict["indicator_index"] = indicator_index
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
        title = d.pop("title")

        def _parse_assignee_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                assignee_id_type_0 = UUID(data)

                return assignee_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        assignee_id = _parse_assignee_id(d.pop("assignee_id", UNSET))

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

        def _parse_indicator_index(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        indicator_index = _parse_indicator_index(d.pop("indicator_index", UNSET))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        _status = d.pop("status", UNSET)
        status: CreateMissionTaskInlineStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = CreateMissionTaskInlineStatus(_status)

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

        create_mission_task_inline = cls(
            title=title,
            assignee_id=assignee_id,
            indicator_id=indicator_id,
            indicator_index=indicator_index,
            description=description,
            status=status,
            due_date=due_date,
        )

        create_mission_task_inline.additional_properties = d
        return create_mission_task_inline

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
