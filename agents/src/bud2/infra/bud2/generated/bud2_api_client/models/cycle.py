from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.cycle_status import CycleStatus
from ..models.cycle_type import CycleType

T = TypeVar("T", bound="Cycle")


@_attrs_define
class Cycle:
    """
    Attributes:
        id (UUID):
        org_id (UUID):
        name (str):
        type_ (CycleType):
        start_date (datetime.date):
        end_date (datetime.date):
        status (CycleStatus):
        okr_definition_deadline (datetime.date | None):
        mid_review_date (datetime.date | None):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
    """

    id: UUID
    org_id: UUID
    name: str
    type_: CycleType
    start_date: datetime.date
    end_date: datetime.date
    status: CycleStatus
    okr_definition_deadline: datetime.date | None
    mid_review_date: datetime.date | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        org_id = str(self.org_id)

        name = self.name

        type_ = self.type_.value

        start_date = self.start_date.isoformat()

        end_date = self.end_date.isoformat()

        status = self.status.value

        okr_definition_deadline: None | str
        if isinstance(self.okr_definition_deadline, datetime.date):
            okr_definition_deadline = self.okr_definition_deadline.isoformat()
        else:
            okr_definition_deadline = self.okr_definition_deadline

        mid_review_date: None | str
        if isinstance(self.mid_review_date, datetime.date):
            mid_review_date = self.mid_review_date.isoformat()
        else:
            mid_review_date = self.mid_review_date

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "org_id": org_id,
                "name": name,
                "type": type_,
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
                "okr_definition_deadline": okr_definition_deadline,
                "mid_review_date": mid_review_date,
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

        name = d.pop("name")

        type_ = CycleType(d.pop("type"))

        start_date = isoparse(d.pop("start_date")).date()

        end_date = isoparse(d.pop("end_date")).date()

        status = CycleStatus(d.pop("status"))

        def _parse_okr_definition_deadline(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                okr_definition_deadline_type_0 = isoparse(data).date()

                return okr_definition_deadline_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        okr_definition_deadline = _parse_okr_definition_deadline(d.pop("okr_definition_deadline"))

        def _parse_mid_review_date(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                mid_review_date_type_0 = isoparse(data).date()

                return mid_review_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        mid_review_date = _parse_mid_review_date(d.pop("mid_review_date"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        cycle = cls(
            id=id,
            org_id=org_id,
            name=name,
            type_=type_,
            start_date=start_date,
            end_date=end_date,
            status=status,
            okr_definition_deadline=okr_definition_deadline,
            mid_review_date=mid_review_date,
            created_at=created_at,
            updated_at=updated_at,
        )

        cycle.additional_properties = d
        return cycle

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
