from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_missions_status import GetMissionsStatus
from ...models.mission_list_response import MissionListResponse
from ...models.problem_detail import ProblemDetail
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    page: int | Unset = 1,
    size: int | Unset = 20,
    parent_id: str | Unset = UNSET,
    status: GetMissionsStatus | Unset = UNSET,
    owner_id: UUID | Unset = UNSET,
    team_id: UUID | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["page"] = page

    params["size"] = size

    params["parent_id"] = parent_id

    json_status: str | Unset = UNSET
    if not isinstance(status, Unset):
        json_status = status.value

    params["status"] = json_status

    json_owner_id: str | Unset = UNSET
    if not isinstance(owner_id, Unset):
        json_owner_id = str(owner_id)
    params["owner_id"] = json_owner_id

    json_team_id: str | Unset = UNSET
    if not isinstance(team_id, Unset):
        json_team_id = str(team_id)
    params["team_id"] = json_team_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/missions",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> MissionListResponse | ProblemDetail | None:
    if response.status_code == 200:
        response_200 = MissionListResponse.from_dict(response.json())

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
) -> Response[MissionListResponse | ProblemDetail]:
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
    parent_id: str | Unset = UNSET,
    status: GetMissionsStatus | Unset = UNSET,
    owner_id: UUID | Unset = UNSET,
    team_id: UUID | Unset = UNSET,
) -> Response[MissionListResponse | ProblemDetail]:
    """List missions in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        parent_id (str | Unset):
        status (GetMissionsStatus | Unset):
        owner_id (UUID | Unset):
        team_id (UUID | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[MissionListResponse | ProblemDetail]
    """

    kwargs = _get_kwargs(
        page=page,
        size=size,
        parent_id=parent_id,
        status=status,
        owner_id=owner_id,
        team_id=team_id,
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
    parent_id: str | Unset = UNSET,
    status: GetMissionsStatus | Unset = UNSET,
    owner_id: UUID | Unset = UNSET,
    team_id: UUID | Unset = UNSET,
) -> MissionListResponse | ProblemDetail | None:
    """List missions in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        parent_id (str | Unset):
        status (GetMissionsStatus | Unset):
        owner_id (UUID | Unset):
        team_id (UUID | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        MissionListResponse | ProblemDetail
    """

    return sync_detailed(
        client=client,
        page=page,
        size=size,
        parent_id=parent_id,
        status=status,
        owner_id=owner_id,
        team_id=team_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    page: int | Unset = 1,
    size: int | Unset = 20,
    parent_id: str | Unset = UNSET,
    status: GetMissionsStatus | Unset = UNSET,
    owner_id: UUID | Unset = UNSET,
    team_id: UUID | Unset = UNSET,
) -> Response[MissionListResponse | ProblemDetail]:
    """List missions in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        parent_id (str | Unset):
        status (GetMissionsStatus | Unset):
        owner_id (UUID | Unset):
        team_id (UUID | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[MissionListResponse | ProblemDetail]
    """

    kwargs = _get_kwargs(
        page=page,
        size=size,
        parent_id=parent_id,
        status=status,
        owner_id=owner_id,
        team_id=team_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    page: int | Unset = 1,
    size: int | Unset = 20,
    parent_id: str | Unset = UNSET,
    status: GetMissionsStatus | Unset = UNSET,
    owner_id: UUID | Unset = UNSET,
    team_id: UUID | Unset = UNSET,
) -> MissionListResponse | ProblemDetail | None:
    """List missions in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        parent_id (str | Unset):
        status (GetMissionsStatus | Unset):
        owner_id (UUID | Unset):
        team_id (UUID | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        MissionListResponse | ProblemDetail
    """

    return (
        await asyncio_detailed(
            client=client,
            page=page,
            size=size,
            parent_id=parent_id,
            status=status,
            owner_id=owner_id,
            team_id=team_id,
        )
    ).parsed
