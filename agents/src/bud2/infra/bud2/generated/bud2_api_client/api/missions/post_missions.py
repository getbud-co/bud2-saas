from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.create_mission_request import CreateMissionRequest
from ...models.mission import Mission
from ...models.problem_detail import ProblemDetail
from ...types import Response


def _get_kwargs(
    *,
    body: CreateMissionRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/missions",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Mission | ProblemDetail | None:
    if response.status_code == 201:
        response_201 = Mission.from_dict(response.json())

        return response_201

    if response.status_code == 401:
        response_401 = ProblemDetail.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = ProblemDetail.from_dict(response.json())

        return response_403

    if response.status_code == 422:
        response_422 = ProblemDetail.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Mission | ProblemDetail]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: CreateMissionRequest,
) -> Response[Mission | ProblemDetail]:
    """Create mission in active organization

    Args:
        body (CreateMissionRequest): POST /missions accepts inline `indicators` and `tasks` so the
            whole
            mission can be created atomically (one request, one transaction). To
            manage indicators/tasks AFTER creation use the `/indicators` and
            `/tasks` endpoints — PATCH /missions/{id} does NOT accept these
            fields. Owner_id of nested children defaults to the mission owner
            when omitted.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Mission | ProblemDetail]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    body: CreateMissionRequest,
) -> Mission | ProblemDetail | None:
    """Create mission in active organization

    Args:
        body (CreateMissionRequest): POST /missions accepts inline `indicators` and `tasks` so the
            whole
            mission can be created atomically (one request, one transaction). To
            manage indicators/tasks AFTER creation use the `/indicators` and
            `/tasks` endpoints — PATCH /missions/{id} does NOT accept these
            fields. Owner_id of nested children defaults to the mission owner
            when omitted.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Mission | ProblemDetail
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: CreateMissionRequest,
) -> Response[Mission | ProblemDetail]:
    """Create mission in active organization

    Args:
        body (CreateMissionRequest): POST /missions accepts inline `indicators` and `tasks` so the
            whole
            mission can be created atomically (one request, one transaction). To
            manage indicators/tasks AFTER creation use the `/indicators` and
            `/tasks` endpoints — PATCH /missions/{id} does NOT accept these
            fields. Owner_id of nested children defaults to the mission owner
            when omitted.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Mission | ProblemDetail]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: CreateMissionRequest,
) -> Mission | ProblemDetail | None:
    """Create mission in active organization

    Args:
        body (CreateMissionRequest): POST /missions accepts inline `indicators` and `tasks` so the
            whole
            mission can be created atomically (one request, one transaction). To
            manage indicators/tasks AFTER creation use the `/indicators` and
            `/tasks` endpoints — PATCH /missions/{id} does NOT accept these
            fields. Owner_id of nested children defaults to the mission owner
            when omitted.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Mission | ProblemDetail
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
