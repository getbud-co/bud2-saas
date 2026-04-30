from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.check_in_confidence import CheckInConfidence
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.check_in_author_type_0 import CheckInAuthorType0


T = TypeVar("T", bound="CheckIn")


@_attrs_define
class CheckIn:
    """
    Attributes:
        id (UUID):
        org_id (UUID):
        indicator_id (UUID):
        author_id (UUID):
        value (str):
        confidence (CheckInConfidence):
        mentions (list[str]):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        previous_value (None | str | Unset):
        note (None | str | Unset):
        author (CheckInAuthorType0 | None | Unset):
    """

    id: UUID
    org_id: UUID
    indicator_id: UUID
    author_id: UUID
    value: str
    confidence: CheckInConfidence
    mentions: list[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    previous_value: None | str | Unset = UNSET
    note: None | str | Unset = UNSET
    author: CheckInAuthorType0 | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.check_in_author_type_0 import CheckInAuthorType0

        id = str(self.id)

        org_id = str(self.org_id)

        indicator_id = str(self.indicator_id)

        author_id = str(self.author_id)

        value = self.value

        confidence = self.confidence.value

        mentions = self.mentions

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        previous_value: None | str | Unset
        if isinstance(self.previous_value, Unset):
            previous_value = UNSET
        else:
            previous_value = self.previous_value

        note: None | str | Unset
        if isinstance(self.note, Unset):
            note = UNSET
        else:
            note = self.note

        author: dict[str, Any] | None | Unset
        if isinstance(self.author, Unset):
            author = UNSET
        elif isinstance(self.author, CheckInAuthorType0):
            author = self.author.to_dict()
        else:
            author = self.author

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "org_id": org_id,
                "indicator_id": indicator_id,
                "author_id": author_id,
                "value": value,
                "confidence": confidence,
                "mentions": mentions,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if previous_value is not UNSET:
            field_dict["previous_value"] = previous_value
        if note is not UNSET:
            field_dict["note"] = note
        if author is not UNSET:
            field_dict["author"] = author

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.check_in_author_type_0 import CheckInAuthorType0

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        org_id = UUID(d.pop("org_id"))

        indicator_id = UUID(d.pop("indicator_id"))

        author_id = UUID(d.pop("author_id"))

        value = d.pop("value")

        confidence = CheckInConfidence(d.pop("confidence"))

        mentions = cast(list[str], d.pop("mentions"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        def _parse_previous_value(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        previous_value = _parse_previous_value(d.pop("previous_value", UNSET))

        def _parse_note(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        note = _parse_note(d.pop("note", UNSET))

        def _parse_author(data: object) -> CheckInAuthorType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                author_type_0 = CheckInAuthorType0.from_dict(data)

                return author_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(CheckInAuthorType0 | None | Unset, data)

        author = _parse_author(d.pop("author", UNSET))

        check_in = cls(
            id=id,
            org_id=org_id,
            indicator_id=indicator_id,
            author_id=author_id,
            value=value,
            confidence=confidence,
            mentions=mentions,
            created_at=created_at,
            updated_at=updated_at,
            previous_value=previous_value,
            note=note,
            author=author,
        )

        check_in.additional_properties = d
        return check_in

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
