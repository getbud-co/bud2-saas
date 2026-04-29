from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.create_check_in_request_confidence import CreateCheckInRequestConfidence
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateCheckInRequest")


@_attrs_define
class CreateCheckInRequest:
    """
    Attributes:
        indicator_id (UUID):
        author_id (UUID):
        value (str):
        confidence (CreateCheckInRequestConfidence):
        previous_value (None | str | Unset):
        note (None | str | Unset):
        mentions (list[str] | Unset):
    """

    indicator_id: UUID
    author_id: UUID
    value: str
    confidence: CreateCheckInRequestConfidence
    previous_value: None | str | Unset = UNSET
    note: None | str | Unset = UNSET
    mentions: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        indicator_id = str(self.indicator_id)

        author_id = str(self.author_id)

        value = self.value

        confidence = self.confidence.value

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

        mentions: list[str] | Unset = UNSET
        if not isinstance(self.mentions, Unset):
            mentions = self.mentions

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "indicator_id": indicator_id,
                "author_id": author_id,
                "value": value,
                "confidence": confidence,
            }
        )
        if previous_value is not UNSET:
            field_dict["previous_value"] = previous_value
        if note is not UNSET:
            field_dict["note"] = note
        if mentions is not UNSET:
            field_dict["mentions"] = mentions

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        indicator_id = UUID(d.pop("indicator_id"))

        author_id = UUID(d.pop("author_id"))

        value = d.pop("value")

        confidence = CreateCheckInRequestConfidence(d.pop("confidence"))

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

        mentions = cast(list[str], d.pop("mentions", UNSET))

        create_check_in_request = cls(
            indicator_id=indicator_id,
            author_id=author_id,
            value=value,
            confidence=confidence,
            previous_value=previous_value,
            note=note,
            mentions=mentions,
        )

        create_check_in_request.additional_properties = d
        return create_check_in_request

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
