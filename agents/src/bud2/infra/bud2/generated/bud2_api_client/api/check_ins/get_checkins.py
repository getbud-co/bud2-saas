from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.check_in_list_response import CheckInListResponse
from ...models.problem_detail import ProblemDetail
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    indicator_id: UUID,
    page: int | Unset = 1,
    size: int | Unset = 50,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_indicator_id = str(indicator_id)
    params["indicator_id"] = json_indicator_id

    params["page"] = page

    params["size"] = size

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/checkins",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CheckInListResponse | ProblemDetail | None:
    if response.status_code == 200:
        response_200 = CheckInListResponse.from_dict(response.json())

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
) -> Response[CheckInListResponse | ProblemDetail]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    indicator_id: UUID,
    page: int | Unset = 1,
    size: int | Unset = 50,
) -> Response[CheckInListResponse | ProblemDetail]:
    """List check-ins by indicator in active organization

    Args:
        indicator_id (UUID):
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CheckInListResponse | ProblemDetail]
    """

    kwargs = _get_kwargs(
        indicator_id=indicator_id,
        page=page,
        size=size,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    indicator_id: UUID,
    page: int | Unset = 1,
    size: int | Unset = 50,
) -> CheckInListResponse | ProblemDetail | None:
    """List check-ins by indicator in active organization

    Args:
        indicator_id (UUID):
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CheckInListResponse | ProblemDetail
    """

    return sync_detailed(
        client=client,
        indicator_id=indicator_id,
        page=page,
        size=size,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    indicator_id: UUID,
    page: int | Unset = 1,
    size: int | Unset = 50,
) -> Response[CheckInListResponse | ProblemDetail]:
    """List check-ins by indicator in active organization

    Args:
        indicator_id (UUID):
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CheckInListResponse | ProblemDetail]
    """

    kwargs = _get_kwargs(
        indicator_id=indicator_id,
        page=page,
        size=size,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    indicator_id: UUID,
    page: int | Unset = 1,
    size: int | Unset = 50,
) -> CheckInListResponse | ProblemDetail | None:
    """List check-ins by indicator in active organization

    Args:
        indicator_id (UUID):
        page (int | Unset):  Default: 1.
        size (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CheckInListResponse | ProblemDetail
    """

    return (
        await asyncio_detailed(
            client=client,
            indicator_id=indicator_id,
            page=page,
            size=size,
        )
    ).parsed
