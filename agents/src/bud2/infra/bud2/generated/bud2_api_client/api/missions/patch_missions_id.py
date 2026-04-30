from http import HTTPStatus
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.mission import Mission
from ...models.patch_mission_request import PatchMissionRequest
from ...models.problem_detail import ProblemDetail
from ...types import Response


def _get_kwargs(
    id: UUID,
    *,
    body: PatchMissionRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/missions/{id}".format(
            id=quote(str(id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Mission | ProblemDetail | None:
    if response.status_code == 200:
        response_200 = Mission.from_dict(response.json())

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

    if response.status_code == 404:
        response_404 = ProblemDetail.from_dict(response.json())

        return response_404

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
    id: UUID,
    *,
    client: AuthenticatedClient,
    body: PatchMissionRequest,
) -> Response[Mission | ProblemDetail]:
    """Partially update mission in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. Note that
    `parent_id` is intentionally NOT exposed: reparent is not supported via
    this endpoint and will be a dedicated feature when needed.

    Args:
        id (UUID):
        body (PatchMissionRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied to the mission. Absent fields preserve their
            existing values. `parent_id` is intentionally NOT exposed — reparent
            is not supported via this endpoint.
            Limitation: with simple pointers we cannot distinguish "field absent"
            from "field explicitly null", so sending null on a nullable field
            does NOT clear it in this iteration.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Mission | ProblemDetail]
    """

    kwargs = _get_kwargs(
        id=id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    id: UUID,
    *,
    client: AuthenticatedClient,
    body: PatchMissionRequest,
) -> Mission | ProblemDetail | None:
    """Partially update mission in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. Note that
    `parent_id` is intentionally NOT exposed: reparent is not supported via
    this endpoint and will be a dedicated feature when needed.

    Args:
        id (UUID):
        body (PatchMissionRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied to the mission. Absent fields preserve their
            existing values. `parent_id` is intentionally NOT exposed — reparent
            is not supported via this endpoint.
            Limitation: with simple pointers we cannot distinguish "field absent"
            from "field explicitly null", so sending null on a nullable field
            does NOT clear it in this iteration.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Mission | ProblemDetail
    """

    return sync_detailed(
        id=id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    id: UUID,
    *,
    client: AuthenticatedClient,
    body: PatchMissionRequest,
) -> Response[Mission | ProblemDetail]:
    """Partially update mission in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. Note that
    `parent_id` is intentionally NOT exposed: reparent is not supported via
    this endpoint and will be a dedicated feature when needed.

    Args:
        id (UUID):
        body (PatchMissionRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied to the mission. Absent fields preserve their
            existing values. `parent_id` is intentionally NOT exposed — reparent
            is not supported via this endpoint.
            Limitation: with simple pointers we cannot distinguish "field absent"
            from "field explicitly null", so sending null on a nullable field
            does NOT clear it in this iteration.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Mission | ProblemDetail]
    """

    kwargs = _get_kwargs(
        id=id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    id: UUID,
    *,
    client: AuthenticatedClient,
    body: PatchMissionRequest,
) -> Mission | ProblemDetail | None:
    """Partially update mission in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. Note that
    `parent_id` is intentionally NOT exposed: reparent is not supported via
    this endpoint and will be a dedicated feature when needed.

    Args:
        id (UUID):
        body (PatchMissionRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied to the mission. Absent fields preserve their
            existing values. `parent_id` is intentionally NOT exposed — reparent
            is not supported via this endpoint.
            Limitation: with simple pointers we cannot distinguish "field absent"
            from "field explicitly null", so sending null on a nullable field
            does NOT clear it in this iteration.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Mission | ProblemDetail
    """

    return (
        await asyncio_detailed(
            id=id,
            client=client,
            body=body,
        )
    ).parsed
