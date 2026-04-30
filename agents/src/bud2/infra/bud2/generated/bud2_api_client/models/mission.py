from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.mission_kanban_status import MissionKanbanStatus
from ..models.mission_status import MissionStatus
from ..models.mission_visibility import MissionVisibility
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.indicator import Indicator
    from ..models.mission_member import MissionMember
    from ..models.task import Task


T = TypeVar("T", bound="Mission")


@_attrs_define
class Mission:
    """
    Attributes:
        id (UUID):
        org_id (UUID):
        parent_id (None | UUID):
        owner_id (UUID):
        team_id (None | UUID):
        title (str):
        description (None | str):
        status (MissionStatus):
        visibility (MissionVisibility):
        kanban_status (MissionKanbanStatus):
        start_date (datetime.date):
        end_date (datetime.date):
        completed_at (datetime.datetime | None):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        indicators (list[Indicator] | Unset): Only populated on the response of POST /missions when the request
            included nested indicators. GET /missions and GET /missions/{id}
            do not return this field — fetch /indicators?mission_id=… instead.
        tasks (list[Task] | Unset): Same semantics as `indicators`: only present on the POST response
            when the request was nested.
        members (list[MissionMember] | Unset):
        tag_ids (list[UUID] | Unset):
    """

    id: UUID
    org_id: UUID
    parent_id: None | UUID
    owner_id: UUID
    team_id: None | UUID
    title: str
    description: None | str
    status: MissionStatus
    visibility: MissionVisibility
    kanban_status: MissionKanbanStatus
    start_date: datetime.date
    end_date: datetime.date
    completed_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    indicators: list[Indicator] | Unset = UNSET
    tasks: list[Task] | Unset = UNSET
    members: list[MissionMember] | Unset = UNSET
    tag_ids: list[UUID] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        org_id = str(self.org_id)

        parent_id: None | str
        if isinstance(self.parent_id, UUID):
            parent_id = str(self.parent_id)
        else:
            parent_id = self.parent_id

        owner_id = str(self.owner_id)

        team_id: None | str
        if isinstance(self.team_id, UUID):
            team_id = str(self.team_id)
        else:
            team_id = self.team_id

        title = self.title

        description: None | str
        description = self.description

        status = self.status.value

        visibility = self.visibility.value

        kanban_status = self.kanban_status.value

        start_date = self.start_date.isoformat()

        end_date = self.end_date.isoformat()

        completed_at: None | str
        if isinstance(self.completed_at, datetime.datetime):
            completed_at = self.completed_at.isoformat()
        else:
            completed_at = self.completed_at

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        indicators: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.indicators, Unset):
            indicators = []
            for indicators_item_data in self.indicators:
                indicators_item = indicators_item_data.to_dict()
                indicators.append(indicators_item)

        tasks: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.tasks, Unset):
            tasks = []
            for tasks_item_data in self.tasks:
                tasks_item = tasks_item_data.to_dict()
                tasks.append(tasks_item)

        members: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.members, Unset):
            members = []
            for members_item_data in self.members:
                members_item = members_item_data.to_dict()
                members.append(members_item)

        tag_ids: list[str] | Unset = UNSET
        if not isinstance(self.tag_ids, Unset):
            tag_ids = []
            for tag_ids_item_data in self.tag_ids:
                tag_ids_item = str(tag_ids_item_data)
                tag_ids.append(tag_ids_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "org_id": org_id,
                "parent_id": parent_id,
                "owner_id": owner_id,
                "team_id": team_id,
                "title": title,
                "description": description,
                "status": status,
                "visibility": visibility,
                "kanban_status": kanban_status,
                "start_date": start_date,
                "end_date": end_date,
                "completed_at": completed_at,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if indicators is not UNSET:
            field_dict["indicators"] = indicators
        if tasks is not UNSET:
            field_dict["tasks"] = tasks
        if members is not UNSET:
            field_dict["members"] = members
        if tag_ids is not UNSET:
            field_dict["tag_ids"] = tag_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.indicator import Indicator
        from ..models.mission_member import MissionMember
        from ..models.task import Task

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        org_id = UUID(d.pop("org_id"))

        def _parse_parent_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                parent_id_type_0 = UUID(data)

                return parent_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        parent_id = _parse_parent_id(d.pop("parent_id"))

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

        status = MissionStatus(d.pop("status"))

        visibility = MissionVisibility(d.pop("visibility"))

        kanban_status = MissionKanbanStatus(d.pop("kanban_status"))

        start_date = isoparse(d.pop("start_date")).date()

        end_date = isoparse(d.pop("end_date")).date()

        def _parse_completed_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                completed_at_type_0 = isoparse(data)

                return completed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        completed_at = _parse_completed_at(d.pop("completed_at"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        _indicators = d.pop("indicators", UNSET)
        indicators: list[Indicator] | Unset = UNSET
        if _indicators is not UNSET:
            indicators = []
            for indicators_item_data in _indicators:
                indicators_item = Indicator.from_dict(indicators_item_data)

                indicators.append(indicators_item)

        _tasks = d.pop("tasks", UNSET)
        tasks: list[Task] | Unset = UNSET
        if _tasks is not UNSET:
            tasks = []
            for tasks_item_data in _tasks:
                tasks_item = Task.from_dict(tasks_item_data)

                tasks.append(tasks_item)

        _members = d.pop("members", UNSET)
        members: list[MissionMember] | Unset = UNSET
        if _members is not UNSET:
            members = []
            for members_item_data in _members:
                members_item = MissionMember.from_dict(members_item_data)

                members.append(members_item)

        _tag_ids = d.pop("tag_ids", UNSET)
        tag_ids: list[UUID] | Unset = UNSET
        if _tag_ids is not UNSET:
            tag_ids = []
            for tag_ids_item_data in _tag_ids:
                tag_ids_item = UUID(tag_ids_item_data)

                tag_ids.append(tag_ids_item)

        mission = cls(
            id=id,
            org_id=org_id,
            parent_id=parent_id,
            owner_id=owner_id,
            team_id=team_id,
            title=title,
            description=description,
            status=status,
            visibility=visibility,
            kanban_status=kanban_status,
            start_date=start_date,
            end_date=end_date,
            completed_at=completed_at,
            created_at=created_at,
            updated_at=updated_at,
            indicators=indicators,
            tasks=tasks,
            members=members,
            tag_ids=tag_ids,
        )

        mission.additional_properties = d
        return mission

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
