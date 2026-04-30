from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.update_cycle_request_status import UpdateCycleRequestStatus
from ..models.update_cycle_request_type import UpdateCycleRequestType
from ..types import UNSET, Unset

T = TypeVar("T", bound="UpdateCycleRequest")


@_attrs_define
class UpdateCycleRequest:
    """
    Attributes:
        name (str):
        type_ (UpdateCycleRequestType):
        start_date (datetime.date):
        end_date (datetime.date):
        status (UpdateCycleRequestStatus):
        okr_definition_deadline (datetime.date | None | Unset):
        mid_review_date (datetime.date | None | Unset):
    """

    name: str
    type_: UpdateCycleRequestType
    start_date: datetime.date
    end_date: datetime.date
    status: UpdateCycleRequestStatus
    okr_definition_deadline: datetime.date | None | Unset = UNSET
    mid_review_date: datetime.date | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        type_ = self.type_.value

        start_date = self.start_date.isoformat()

        end_date = self.end_date.isoformat()

        status = self.status.value

        okr_definition_deadline: None | str | Unset
        if isinstance(self.okr_definition_deadline, Unset):
            okr_definition_deadline = UNSET
        elif isinstance(self.okr_definition_deadline, datetime.date):
            okr_definition_deadline = self.okr_definition_deadline.isoformat()
        else:
            okr_definition_deadline = self.okr_definition_deadline

        mid_review_date: None | str | Unset
        if isinstance(self.mid_review_date, Unset):
            mid_review_date = UNSET
        elif isinstance(self.mid_review_date, datetime.date):
            mid_review_date = self.mid_review_date.isoformat()
        else:
            mid_review_date = self.mid_review_date

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "type": type_,
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
            }
        )
        if okr_definition_deadline is not UNSET:
            field_dict["okr_definition_deadline"] = okr_definition_deadline
        if mid_review_date is not UNSET:
            field_dict["mid_review_date"] = mid_review_date

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        type_ = UpdateCycleRequestType(d.pop("type"))

        start_date = isoparse(d.pop("start_date")).date()

        end_date = isoparse(d.pop("end_date")).date()

        status = UpdateCycleRequestStatus(d.pop("status"))

        def _parse_okr_definition_deadline(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                okr_definition_deadline_type_0 = isoparse(data).date()

                return okr_definition_deadline_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        okr_definition_deadline = _parse_okr_definition_deadline(d.pop("okr_definition_deadline", UNSET))

        def _parse_mid_review_date(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                mid_review_date_type_0 = isoparse(data).date()

                return mid_review_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        mid_review_date = _parse_mid_review_date(d.pop("mid_review_date", UNSET))

        update_cycle_request = cls(
            name=name,
            type_=type_,
            start_date=start_date,
            end_date=end_date,
            status=status,
            okr_definition_deadline=okr_definition_deadline,
            mid_review_date=mid_review_date,
        )

        update_cycle_request.additional_properties = d
        return update_cycle_request

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
