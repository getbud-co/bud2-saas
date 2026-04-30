from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.patch_check_in_request_confidence import PatchCheckInRequestConfidence
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchCheckInRequest")


@_attrs_define
class PatchCheckInRequest:
    """
    Attributes:
        value (str):
        confidence (PatchCheckInRequestConfidence):
        note (None | str | Unset):
        mentions (list[str] | Unset):
    """

    value: str
    confidence: PatchCheckInRequestConfidence
    note: None | str | Unset = UNSET
    mentions: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        value = self.value

        confidence = self.confidence.value

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
                "value": value,
                "confidence": confidence,
            }
        )
        if note is not UNSET:
            field_dict["note"] = note
        if mentions is not UNSET:
            field_dict["mentions"] = mentions

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        value = d.pop("value")

        confidence = PatchCheckInRequestConfidence(d.pop("confidence"))

        def _parse_note(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        note = _parse_note(d.pop("note", UNSET))

        mentions = cast(list[str], d.pop("mentions", UNSET))

        patch_check_in_request = cls(
            value=value,
            confidence=confidence,
            note=note,
            mentions=mentions,
        )

        patch_check_in_request.additional_properties = d
        return patch_check_in_request

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
