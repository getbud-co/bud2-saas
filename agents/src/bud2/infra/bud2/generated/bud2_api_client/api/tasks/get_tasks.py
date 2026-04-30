from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_tasks_status import GetTasksStatus
from ...models.problem_detail import ProblemDetail
from ...models.task_list_response import TaskListResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    page: int | Unset = 1,
    size: int | Unset = 20,
    mission_id: UUID | Unset = UNSET,
    assignee_id: UUID | Unset = UNSET,
    status: GetTasksStatus | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["page"] = page

    params["size"] = size

    json_mission_id: str | Unset = UNSET
    if not isinstance(mission_id, Unset):
        json_mission_id = str(mission_id)
    params["mission_id"] = json_mission_id

    json_assignee_id: str | Unset = UNSET
    if not isinstance(assignee_id, Unset):
        json_assignee_id = str(assignee_id)
    params["assignee_id"] = json_assignee_id

    json_status: str | Unset = UNSET
    if not isinstance(status, Unset):
        json_status = status.value

    params["status"] = json_status

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/tasks",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ProblemDetail | TaskListResponse | None:
    if response.status_code == 200:
        response_200 = TaskListResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = ProblemDetail.from_dict(response.json())

        return response_400

    if response.status_code == 401:
        response_401 = ProblemDetail.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = ProblemDetail.from_dict(response.json())

        return response_403

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[ProblemDetail | TaskListResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    page: int | Unset = 1,
    size: int | Unset = 20,
    mission_id: UUID | Unset = UNSET,
    assignee_id: UUID | Unset = UNSET,
    status: GetTasksStatus | Unset = UNSET,
) -> Response[ProblemDetail | TaskListResponse]:
    """List tasks in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        mission_id (UUID | Unset):
        assignee_id (UUID | Unset):
        status (GetTasksStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ProblemDetail | TaskListResponse]
    """

    kwargs = _get_kwargs(
        page=page,
        size=size,
        mission_id=mission_id,
        assignee_id=assignee_id,
        status=status,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    page: int | Unset = 1,
    size: int | Unset = 20,
    mission_id: UUID | Unset = UNSET,
    assignee_id: UUID | Unset = UNSET,
    status: GetTasksStatus | Unset = UNSET,
) -> ProblemDetail | TaskListResponse | None:
    """List tasks in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        mission_id (UUID | Unset):
        assignee_id (UUID | Unset):
        status (GetTasksStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ProblemDetail | TaskListResponse
    """

    return sync_detailed(
        client=client,
        page=page,
        size=size,
        mission_id=mission_id,
        assignee_id=assignee_id,
        status=status,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    page: int | Unset = 1,
    size: int | Unset = 20,
    mission_id: UUID | Unset = UNSET,
    assignee_id: UUID | Unset = UNSET,
    status: GetTasksStatus | Unset = UNSET,
) -> Response[ProblemDetail | TaskListResponse]:
    """List tasks in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        mission_id (UUID | Unset):
        assignee_id (UUID | Unset):
        status (GetTasksStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ProblemDetail | TaskListResponse]
    """

    kwargs = _get_kwargs(
        page=page,
        size=size,
        mission_id=mission_id,
        assignee_id=assignee_id,
        status=status,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    page: int | Unset = 1,
    size: int | Unset = 20,
    mission_id: UUID | Unset = UNSET,
    assignee_id: UUID | Unset = UNSET,
    status: GetTasksStatus | Unset = UNSET,
) -> ProblemDetail | TaskListResponse | None:
    """List tasks in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        mission_id (UUID | Unset):
        assignee_id (UUID | Unset):
        status (GetTasksStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ProblemDetail | TaskListResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            page=page,
            size=size,
            mission_id=mission_id,
            assignee_id=assignee_id,
            status=status,
        )
    ).parsed
