from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.indicator_goal_type import IndicatorGoalType
from ..models.indicator_measurement_mode import IndicatorMeasurementMode
from ..models.indicator_status import IndicatorStatus

T = TypeVar("T", bound="Indicator")


@_attrs_define
class Indicator:
    """
    Attributes:
        id (UUID):
        org_id (UUID):
        mission_id (UUID):
        owner_id (UUID):
        team_id (None | UUID):
        title (str):
        description (None | str):
        target_value (float | None):
        current_value (float | None):
        unit (None | str):
        status (IndicatorStatus):
        due_date (datetime.date | None):
        measurement_mode (IndicatorMeasurementMode):
        goal_type (IndicatorGoalType):
        low_threshold (float | None):
        high_threshold (float | None):
        period_start (datetime.date | None):
        period_end (datetime.date | None):
        linked_survey_id (None | UUID):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
    """

    id: UUID
    org_id: UUID
    mission_id: UUID
    owner_id: UUID
    team_id: None | UUID
    title: str
    description: None | str
    target_value: float | None
    current_value: float | None
    unit: None | str
    status: IndicatorStatus
    due_date: datetime.date | None
    measurement_mode: IndicatorMeasurementMode
    goal_type: IndicatorGoalType
    low_threshold: float | None
    high_threshold: float | None
    period_start: datetime.date | None
    period_end: datetime.date | None
    linked_survey_id: None | UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        org_id = str(self.org_id)

        mission_id = str(self.mission_id)

        owner_id = str(self.owner_id)

        team_id: None | str
        if isinstance(self.team_id, UUID):
            team_id = str(self.team_id)
        else:
            team_id = self.team_id

        title = self.title

        description: None | str
        description = self.description

        target_value: float | None
        target_value = self.target_value

        current_value: float | None
        current_value = self.current_value

        unit: None | str
        unit = self.unit

        status = self.status.value

        due_date: None | str
        if isinstance(self.due_date, datetime.date):
            due_date = self.due_date.isoformat()
        else:
            due_date = self.due_date

        measurement_mode = self.measurement_mode.value

        goal_type = self.goal_type.value

        low_threshold: float | None
        low_threshold = self.low_threshold

        high_threshold: float | None
        high_threshold = self.high_threshold

        period_start: None | str
        if isinstance(self.period_start, datetime.date):
            period_start = self.period_start.isoformat()
        else:
            period_start = self.period_start

        period_end: None | str
        if isinstance(self.period_end, datetime.date):
            period_end = self.period_end.isoformat()
        else:
            period_end = self.period_end

        linked_survey_id: None | str
        if isinstance(self.linked_survey_id, UUID):
            linked_survey_id = str(self.linked_survey_id)
        else:
            linked_survey_id = self.linked_survey_id

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "org_id": org_id,
                "mission_id": mission_id,
                "owner_id": owner_id,
                "team_id": team_id,
                "title": title,
                "description": description,
                "target_value": target_value,
                "current_value": current_value,
                "unit": unit,
                "status": status,
                "due_date": due_date,
                "measurement_mode": measurement_mode,
                "goal_type": goal_type,
                "low_threshold": low_threshold,
                "high_threshold": high_threshold,
                "period_start": period_start,
                "period_end": period_end,
                "linked_survey_id": linked_survey_id,
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

        owner_id = UUID(d.pop("owner_id"))

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

        title = d.pop("title")

        def _parse_description(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        description = _parse_description(d.pop("description"))

        def _parse_target_value(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        target_value = _parse_target_value(d.pop("target_value"))

        def _parse_current_value(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        current_value = _parse_current_value(d.pop("current_value"))

        def _parse_unit(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        unit = _parse_unit(d.pop("unit"))

        status = IndicatorStatus(d.pop("status"))

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

        measurement_mode = IndicatorMeasurementMode(d.pop("measurement_mode"))

        goal_type = IndicatorGoalType(d.pop("goal_type"))

        def _parse_low_threshold(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        low_threshold = _parse_low_threshold(d.pop("low_threshold"))

        def _parse_high_threshold(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        high_threshold = _parse_high_threshold(d.pop("high_threshold"))

        def _parse_period_start(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                period_start_type_0 = isoparse(data).date()

                return period_start_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        period_start = _parse_period_start(d.pop("period_start"))

        def _parse_period_end(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                period_end_type_0 = isoparse(data).date()

                return period_end_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        period_end = _parse_period_end(d.pop("period_end"))

        def _parse_linked_survey_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                linked_survey_id_type_0 = UUID(data)

                return linked_survey_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        linked_survey_id = _parse_linked_survey_id(d.pop("linked_survey_id"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        indicator = cls(
            id=id,
            org_id=org_id,
            mission_id=mission_id,
            owner_id=owner_id,
            team_id=team_id,
            title=title,
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
            created_at=created_at,
            updated_at=updated_at,
        )

        indicator.additional_properties = d
        return indicator

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
