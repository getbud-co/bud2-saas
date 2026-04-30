from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.create_mission_indicator_inline_status import CreateMissionIndicatorInlineStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateMissionIndicatorInline")


@_attrs_define
class CreateMissionIndicatorInline:
    """Indicator created inline with its parent mission. mission_id is supplied by the parent.

    Attributes:
        title (str):
        owner_id (None | Unset | UUID):
        description (None | str | Unset):
        target_value (float | None | Unset):
        current_value (float | None | Unset):
        unit (None | str | Unset):
        status (CreateMissionIndicatorInlineStatus | Unset):
        due_date (datetime.date | None | Unset):
    """

    title: str
    owner_id: None | Unset | UUID = UNSET
    description: None | str | Unset = UNSET
    target_value: float | None | Unset = UNSET
    current_value: float | None | Unset = UNSET
    unit: None | str | Unset = UNSET
    status: CreateMissionIndicatorInlineStatus | Unset = UNSET
    due_date: datetime.date | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        title = self.title

        owner_id: None | str | Unset
        if isinstance(self.owner_id, Unset):
            owner_id = UNSET
        elif isinstance(self.owner_id, UUID):
            owner_id = str(self.owner_id)
        else:
            owner_id = self.owner_id

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        target_value: float | None | Unset
        if isinstance(self.target_value, Unset):
            target_value = UNSET
        else:
            target_value = self.target_value

        current_value: float | None | Unset
        if isinstance(self.current_value, Unset):
            current_value = UNSET
        else:
            current_value = self.current_value

        unit: None | str | Unset
        if isinstance(self.unit, Unset):
            unit = UNSET
        else:
            unit = self.unit

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
        if owner_id is not UNSET:
            field_dict["owner_id"] = owner_id
        if description is not UNSET:
            field_dict["description"] = description
        if target_value is not UNSET:
            field_dict["target_value"] = target_value
        if current_value is not UNSET:
            field_dict["current_value"] = current_value
        if unit is not UNSET:
            field_dict["unit"] = unit
        if status is not UNSET:
            field_dict["status"] = status
        if due_date is not UNSET:
            field_dict["due_date"] = due_date

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        title = d.pop("title")

        def _parse_owner_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                owner_id_type_0 = UUID(data)

                return owner_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        owner_id = _parse_owner_id(d.pop("owner_id", UNSET))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        def _parse_target_value(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        target_value = _parse_target_value(d.pop("target_value", UNSET))

        def _parse_current_value(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        current_value = _parse_current_value(d.pop("current_value", UNSET))

        def _parse_unit(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        unit = _parse_unit(d.pop("unit", UNSET))

        _status = d.pop("status", UNSET)
        status: CreateMissionIndicatorInlineStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = CreateMissionIndicatorInlineStatus(_status)

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

        create_mission_indicator_inline = cls(
            title=title,
            owner_id=owner_id,
            description=description,
            target_value=target_value,
            current_value=current_value,
            unit=unit,
            status=status,
            due_date=due_date,
        )

        create_mission_indicator_inline.additional_properties = d
        return create_mission_indicator_inline

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
