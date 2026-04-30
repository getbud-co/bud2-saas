from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.create_indicator_request_goal_type import CreateIndicatorRequestGoalType
from ..models.create_indicator_request_measurement_mode import CreateIndicatorRequestMeasurementMode
from ..models.create_indicator_request_status import CreateIndicatorRequestStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateIndicatorRequest")


@_attrs_define
class CreateIndicatorRequest:
    """
    Attributes:
        mission_id (UUID):
        owner_id (UUID):
        title (str):
        team_id (None | Unset | UUID):
        description (None | str | Unset):
        target_value (float | None | Unset):
        current_value (float | None | Unset):
        unit (None | str | Unset):
        status (CreateIndicatorRequestStatus | Unset):
        due_date (datetime.date | None | Unset):
        measurement_mode (CreateIndicatorRequestMeasurementMode | Unset):
        goal_type (CreateIndicatorRequestGoalType | Unset):
        low_threshold (float | None | Unset):
        high_threshold (float | None | Unset):
        period_start (datetime.date | None | Unset):
        period_end (datetime.date | None | Unset):
        linked_survey_id (None | Unset | UUID):
    """

    mission_id: UUID
    owner_id: UUID
    title: str
    team_id: None | Unset | UUID = UNSET
    description: None | str | Unset = UNSET
    target_value: float | None | Unset = UNSET
    current_value: float | None | Unset = UNSET
    unit: None | str | Unset = UNSET
    status: CreateIndicatorRequestStatus | Unset = UNSET
    due_date: datetime.date | None | Unset = UNSET
    measurement_mode: CreateIndicatorRequestMeasurementMode | Unset = UNSET
    goal_type: CreateIndicatorRequestGoalType | Unset = UNSET
    low_threshold: float | None | Unset = UNSET
    high_threshold: float | None | Unset = UNSET
    period_start: datetime.date | None | Unset = UNSET
    period_end: datetime.date | None | Unset = UNSET
    linked_survey_id: None | Unset | UUID = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        mission_id = str(self.mission_id)

        owner_id = str(self.owner_id)

        title = self.title

        team_id: None | str | Unset
        if isinstance(self.team_id, Unset):
            team_id = UNSET
        elif isinstance(self.team_id, UUID):
            team_id = str(self.team_id)
        else:
            team_id = self.team_id

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

        measurement_mode: str | Unset = UNSET
        if not isinstance(self.measurement_mode, Unset):
            measurement_mode = self.measurement_mode.value

        goal_type: str | Unset = UNSET
        if not isinstance(self.goal_type, Unset):
            goal_type = self.goal_type.value

        low_threshold: float | None | Unset
        if isinstance(self.low_threshold, Unset):
            low_threshold = UNSET
        else:
            low_threshold = self.low_threshold

        high_threshold: float | None | Unset
        if isinstance(self.high_threshold, Unset):
            high_threshold = UNSET
        else:
            high_threshold = self.high_threshold

        period_start: None | str | Unset
        if isinstance(self.period_start, Unset):
            period_start = UNSET
        elif isinstance(self.period_start, datetime.date):
            period_start = self.period_start.isoformat()
        else:
            period_start = self.period_start

        period_end: None | str | Unset
        if isinstance(self.period_end, Unset):
            period_end = UNSET
        elif isinstance(self.period_end, datetime.date):
            period_end = self.period_end.isoformat()
        else:
            period_end = self.period_end

        linked_survey_id: None | str | Unset
        if isinstance(self.linked_survey_id, Unset):
            linked_survey_id = UNSET
        elif isinstance(self.linked_survey_id, UUID):
            linked_survey_id = str(self.linked_survey_id)
        else:
            linked_survey_id = self.linked_survey_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "mission_id": mission_id,
                "owner_id": owner_id,
                "title": title,
            }
        )
        if team_id is not UNSET:
            field_dict["team_id"] = team_id
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
        if measurement_mode is not UNSET:
            field_dict["measurement_mode"] = measurement_mode
        if goal_type is not UNSET:
            field_dict["goal_type"] = goal_type
        if low_threshold is not UNSET:
            field_dict["low_threshold"] = low_threshold
        if high_threshold is not UNSET:
            field_dict["high_threshold"] = high_threshold
        if period_start is not UNSET:
            field_dict["period_start"] = period_start
        if period_end is not UNSET:
            field_dict["period_end"] = period_end
        if linked_survey_id is not UNSET:
            field_dict["linked_survey_id"] = linked_survey_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        mission_id = UUID(d.pop("mission_id"))

        owner_id = UUID(d.pop("owner_id"))

        title = d.pop("title")

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
        status: CreateIndicatorRequestStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = CreateIndicatorRequestStatus(_status)

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

        _measurement_mode = d.pop("measurement_mode", UNSET)
        measurement_mode: CreateIndicatorRequestMeasurementMode | Unset
        if isinstance(_measurement_mode, Unset):
            measurement_mode = UNSET
        else:
            measurement_mode = CreateIndicatorRequestMeasurementMode(_measurement_mode)

        _goal_type = d.pop("goal_type", UNSET)
        goal_type: CreateIndicatorRequestGoalType | Unset
        if isinstance(_goal_type, Unset):
            goal_type = UNSET
        else:
            goal_type = CreateIndicatorRequestGoalType(_goal_type)

        def _parse_low_threshold(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        low_threshold = _parse_low_threshold(d.pop("low_threshold", UNSET))

        def _parse_high_threshold(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        high_threshold = _parse_high_threshold(d.pop("high_threshold", UNSET))

        def _parse_period_start(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                period_start_type_0 = isoparse(data).date()

                return period_start_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        period_start = _parse_period_start(d.pop("period_start", UNSET))

        def _parse_period_end(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                period_end_type_0 = isoparse(data).date()

                return period_end_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        period_end = _parse_period_end(d.pop("period_end", UNSET))

        def _parse_linked_survey_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                linked_survey_id_type_0 = UUID(data)

                return linked_survey_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        linked_survey_id = _parse_linked_survey_id(d.pop("linked_survey_id", UNSET))

        create_indicator_request = cls(
            mission_id=mission_id,
            owner_id=owner_id,
            title=title,
            team_id=team_id,
            description=description,
            target_value=target_value,
            current_value=current_value,
            unit=unit,
            status=status,
            due_date=due_date,
            measurement_mode=measurement_mode,
            goal_type=goal_type,
            low_threshold=low_threshold,
            high_threshold=high_threshold,
            period_start=period_start,
            period_end=period_end,
            linked_survey_id=linked_survey_id,
        )

        create_indicator_request.additional_properties = d
        return create_indicator_request

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
