from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_teams_status import GetTeamsStatus
from ...models.problem_detail import ProblemDetail
from ...models.team_list_response import TeamListResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    page: int | Unset = 1,
    size: int | Unset = 20,
    status: GetTeamsStatus | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["page"] = page

    params["size"] = size

    json_status: str | Unset = UNSET
    if not isinstance(status, Unset):
        json_status = status.value

    params["status"] = json_status

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/teams",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ProblemDetail | TeamListResponse | None:
    if response.status_code == 200:
        response_200 = TeamListResponse.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = ProblemDetail.from_dict(response.json())

        return response_401

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[ProblemDetail | TeamListResponse]:
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
    status: GetTeamsStatus | Unset = UNSET,
) -> Response[ProblemDetail | TeamListResponse]:
    """List teams in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        status (GetTeamsStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ProblemDetail | TeamListResponse]
    """

    kwargs = _get_kwargs(
        page=page,
        size=size,
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
    status: GetTeamsStatus | Unset = UNSET,
) -> ProblemDetail | TeamListResponse | None:
    """List teams in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        status (GetTeamsStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ProblemDetail | TeamListResponse
    """

    return sync_detailed(
        client=client,
        page=page,
        size=size,
        status=status,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    page: int | Unset = 1,
    size: int | Unset = 20,
    status: GetTeamsStatus | Unset = UNSET,
) -> Response[ProblemDetail | TeamListResponse]:
    """List teams in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        status (GetTeamsStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ProblemDetail | TeamListResponse]
    """

    kwargs = _get_kwargs(
        page=page,
        size=size,
        status=status,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    page: int | Unset = 1,
    size: int | Unset = 20,
    status: GetTeamsStatus | Unset = UNSET,
) -> ProblemDetail | TeamListResponse | None:
    """List teams in active organization

    Args:
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 20.
        status (GetTeamsStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ProblemDetail | TeamListResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            page=page,
            size=size,
            status=status,
        )
    ).parsed
