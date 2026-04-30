from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.create_mission_request_kanban_status import CreateMissionRequestKanbanStatus
from ..models.create_mission_request_status import CreateMissionRequestStatus
from ..models.create_mission_request_visibility import CreateMissionRequestVisibility
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_mission_indicator_inline import CreateMissionIndicatorInline
    from ..models.create_mission_request_members_item import CreateMissionRequestMembersItem
    from ..models.create_mission_task_inline import CreateMissionTaskInline


T = TypeVar("T", bound="CreateMissionRequest")


@_attrs_define
class CreateMissionRequest:
    """POST /missions accepts inline `indicators` and `tasks` so the whole
    mission can be created atomically (one request, one transaction). To
    manage indicators/tasks AFTER creation use the `/indicators` and
    `/tasks` endpoints — PATCH /missions/{id} does NOT accept these
    fields. Owner_id of nested children defaults to the mission owner
    when omitted.

        Attributes:
            title (str):
            owner_id (UUID):
            start_date (datetime.date):
            end_date (datetime.date):
            description (None | str | Unset):
            parent_id (None | Unset | UUID):
            team_id (None | Unset | UUID):
            status (CreateMissionRequestStatus | Unset):
            visibility (CreateMissionRequestVisibility | Unset):
            kanban_status (CreateMissionRequestKanbanStatus | Unset):
            members (list[CreateMissionRequestMembersItem] | Unset):
            tag_ids (list[UUID] | Unset):
            indicators (list[CreateMissionIndicatorInline] | Unset):
            tasks (list[CreateMissionTaskInline] | Unset):
    """

    title: str
    owner_id: UUID
    start_date: datetime.date
    end_date: datetime.date
    description: None | str | Unset = UNSET
    parent_id: None | Unset | UUID = UNSET
    team_id: None | Unset | UUID = UNSET
    status: CreateMissionRequestStatus | Unset = UNSET
    visibility: CreateMissionRequestVisibility | Unset = UNSET
    kanban_status: CreateMissionRequestKanbanStatus | Unset = UNSET
    members: list[CreateMissionRequestMembersItem] | Unset = UNSET
    tag_ids: list[UUID] | Unset = UNSET
    indicators: list[CreateMissionIndicatorInline] | Unset = UNSET
    tasks: list[CreateMissionTaskInline] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        title = self.title

        owner_id = str(self.owner_id)

        start_date = self.start_date.isoformat()

        end_date = self.end_date.isoformat()

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        parent_id: None | str | Unset
        if isinstance(self.parent_id, Unset):
            parent_id = UNSET
        elif isinstance(self.parent_id, UUID):
            parent_id = str(self.parent_id)
        else:
            parent_id = self.parent_id

        team_id: None | str | Unset
        if isinstance(self.team_id, Unset):
            team_id = UNSET
        elif isinstance(self.team_id, UUID):
            team_id = str(self.team_id)
        else:
            team_id = self.team_id

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        visibility: str | Unset = UNSET
        if not isinstance(self.visibility, Unset):
            visibility = self.visibility.value

        kanban_status: str | Unset = UNSET
        if not isinstance(self.kanban_status, Unset):
            kanban_status = self.kanban_status.value

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

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "title": title,
                "owner_id": owner_id,
                "start_date": start_date,
                "end_date": end_date,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if parent_id is not UNSET:
            field_dict["parent_id"] = parent_id
        if team_id is not UNSET:
            field_dict["team_id"] = team_id
        if status is not UNSET:
            field_dict["status"] = status
        if visibility is not UNSET:
            field_dict["visibility"] = visibility
        if kanban_status is not UNSET:
            field_dict["kanban_status"] = kanban_status
        if members is not UNSET:
            field_dict["members"] = members
        if tag_ids is not UNSET:
            field_dict["tag_ids"] = tag_ids
        if indicators is not UNSET:
            field_dict["indicators"] = indicators
        if tasks is not UNSET:
            field_dict["tasks"] = tasks

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_mission_indicator_inline import CreateMissionIndicatorInline
        from ..models.create_mission_request_members_item import CreateMissionRequestMembersItem
        from ..models.create_mission_task_inline import CreateMissionTaskInline

        d = dict(src_dict)
        title = d.pop("title")

        owner_id = UUID(d.pop("owner_id"))

        start_date = isoparse(d.pop("start_date")).date()

        end_date = isoparse(d.pop("end_date")).date()

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        def _parse_parent_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                parent_id_type_0 = UUID(data)

                return parent_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        parent_id = _parse_parent_id(d.pop("parent_id", UNSET))

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

        _status = d.pop("status", UNSET)
        status: CreateMissionRequestStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = CreateMissionRequestStatus(_status)

        _visibility = d.pop("visibility", UNSET)
        visibility: CreateMissionRequestVisibility | Unset
        if isinstance(_visibility, Unset):
            visibility = UNSET
        else:
            visibility = CreateMissionRequestVisibility(_visibility)

        _kanban_status = d.pop("kanban_status", UNSET)
        kanban_status: CreateMissionRequestKanbanStatus | Unset
        if isinstance(_kanban_status, Unset):
            kanban_status = UNSET
        else:
            kanban_status = CreateMissionRequestKanbanStatus(_kanban_status)

        _members = d.pop("members", UNSET)
        members: list[CreateMissionRequestMembersItem] | Unset = UNSET
        if _members is not UNSET:
            members = []
            for members_item_data in _members:
                members_item = CreateMissionRequestMembersItem.from_dict(members_item_data)

                members.append(members_item)

        _tag_ids = d.pop("tag_ids", UNSET)
        tag_ids: list[UUID] | Unset = UNSET
        if _tag_ids is not UNSET:
            tag_ids = []
            for tag_ids_item_data in _tag_ids:
                tag_ids_item = UUID(tag_ids_item_data)

                tag_ids.append(tag_ids_item)

        _indicators = d.pop("indicators", UNSET)
        indicators: list[CreateMissionIndicatorInline] | Unset = UNSET
        if _indicators is not UNSET:
            indicators = []
            for indicators_item_data in _indicators:
                indicators_item = CreateMissionIndicatorInline.from_dict(indicators_item_data)

                indicators.append(indicators_item)

        _tasks = d.pop("tasks", UNSET)
        tasks: list[CreateMissionTaskInline] | Unset = UNSET
        if _tasks is not UNSET:
            tasks = []
            for tasks_item_data in _tasks:
                tasks_item = CreateMissionTaskInline.from_dict(tasks_item_data)

                tasks.append(tasks_item)

        create_mission_request = cls(
            title=title,
            owner_id=owner_id,
            start_date=start_date,
            end_date=end_date,
            description=description,
            parent_id=parent_id,
            team_id=team_id,
            status=status,
            visibility=visibility,
            kanban_status=kanban_status,
            members=members,
            tag_ids=tag_ids,
            indicators=indicators,
            tasks=tasks,
        )

        create_mission_request.additional_properties = d
        return create_mission_request

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
