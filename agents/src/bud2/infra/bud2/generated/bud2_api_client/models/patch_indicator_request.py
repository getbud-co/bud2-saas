from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.patch_indicator_request_goal_type import PatchIndicatorRequestGoalType
from ..models.patch_indicator_request_measurement_mode import PatchIndicatorRequestMeasurementMode
from ..models.patch_indicator_request_status import PatchIndicatorRequestStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchIndicatorRequest")


@_attrs_define
class PatchIndicatorRequest:
    """JSON Merge Patch body. All fields are optional; only fields present in
    the request are applied. `mission_id` is intentionally NOT exposed —
    moving an indicator between missions is not supported via this endpoint.
    Same null-vs-absent limitation as the mission patch endpoint.

        Attributes:
            title (str | Unset):
            description (str | Unset):
            owner_id (UUID | Unset):
            team_id (UUID | Unset):
            target_value (float | Unset):
            current_value (float | Unset):
            unit (str | Unset):
            status (PatchIndicatorRequestStatus | Unset):
            due_date (datetime.date | Unset):
            measurement_mode (PatchIndicatorRequestMeasurementMode | Unset):
            goal_type (PatchIndicatorRequestGoalType | Unset):
            low_threshold (float | Unset):
            high_threshold (float | Unset):
            period_start (datetime.date | Unset):
            period_end (datetime.date | Unset):
            linked_survey_id (UUID | Unset):
    """

    title: str | Unset = UNSET
    description: str | Unset = UNSET
    owner_id: UUID | Unset = UNSET
    team_id: UUID | Unset = UNSET
    target_value: float | Unset = UNSET
    current_value: float | Unset = UNSET
    unit: str | Unset = UNSET
    status: PatchIndicatorRequestStatus | Unset = UNSET
    due_date: datetime.date | Unset = UNSET
    measurement_mode: PatchIndicatorRequestMeasurementMode | Unset = UNSET
    goal_type: PatchIndicatorRequestGoalType | Unset = UNSET
    low_threshold: float | Unset = UNSET
    high_threshold: float | Unset = UNSET
    period_start: datetime.date | Unset = UNSET
    period_end: datetime.date | Unset = UNSET
    linked_survey_id: UUID | Unset = UNSET
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

        target_value = self.target_value

        current_value = self.current_value

        unit = self.unit

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        due_date: str | Unset = UNSET
        if not isinstance(self.due_date, Unset):
            due_date = self.due_date.isoformat()

        measurement_mode: str | Unset = UNSET
        if not isinstance(self.measurement_mode, Unset):
            measurement_mode = self.measurement_mode.value

        goal_type: str | Unset = UNSET
        if not isinstance(self.goal_type, Unset):
            goal_type = self.goal_type.value

        low_threshold = self.low_threshold

        high_threshold = self.high_threshold

        period_start: str | Unset = UNSET
        if not isinstance(self.period_start, Unset):
            period_start = self.period_start.isoformat()

        period_end: str | Unset = UNSET
        if not isinstance(self.period_end, Unset):
            period_end = self.period_end.isoformat()

        linked_survey_id: str | Unset = UNSET
        if not isinstance(self.linked_survey_id, Unset):
            linked_survey_id = str(self.linked_survey_id)

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

        target_value = d.pop("target_value", UNSET)

        current_value = d.pop("current_value", UNSET)

        unit = d.pop("unit", UNSET)

        _status = d.pop("status", UNSET)
        status: PatchIndicatorRequestStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = PatchIndicatorRequestStatus(_status)

        _due_date = d.pop("due_date", UNSET)
        due_date: datetime.date | Unset
        if isinstance(_due_date, Unset):
            due_date = UNSET
        else:
            due_date = isoparse(_due_date).date()

        _measurement_mode = d.pop("measurement_mode", UNSET)
        measurement_mode: PatchIndicatorRequestMeasurementMode | Unset
        if isinstance(_measurement_mode, Unset):
            measurement_mode = UNSET
        else:
            measurement_mode = PatchIndicatorRequestMeasurementMode(_measurement_mode)

        _goal_type = d.pop("goal_type", UNSET)
        goal_type: PatchIndicatorRequestGoalType | Unset
        if isinstance(_goal_type, Unset):
            goal_type = UNSET
        else:
            goal_type = PatchIndicatorRequestGoalType(_goal_type)

        low_threshold = d.pop("low_threshold", UNSET)

        high_threshold = d.pop("high_threshold", UNSET)

        _period_start = d.pop("period_start", UNSET)
        period_start: datetime.date | Unset
        if isinstance(_period_start, Unset):
            period_start = UNSET
        else:
            period_start = isoparse(_period_start).date()

        _period_end = d.pop("period_end", UNSET)
        period_end: datetime.date | Unset
        if isinstance(_period_end, Unset):
            period_end = UNSET
        else:
            period_end = isoparse(_period_end).date()

        _linked_survey_id = d.pop("linked_survey_id", UNSET)
        linked_survey_id: UUID | Unset
        if isinstance(_linked_survey_id, Unset):
            linked_survey_id = UNSET
        else:
            linked_survey_id = UUID(_linked_survey_id)

        patch_indicator_request = cls(
            title=title,
            description=description,
            owner_id=owner_id,
            team_id=team_id,
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

        patch_indicator_request.additional_properties = d
        return patch_indicator_request

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
