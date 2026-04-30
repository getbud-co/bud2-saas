from http import HTTPStatus
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.indicator import Indicator
from ...models.patch_indicator_request import PatchIndicatorRequest
from ...models.problem_detail import ProblemDetail
from ...types import Response


def _get_kwargs(
    id: UUID,
    *,
    body: PatchIndicatorRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/indicators/{id}".format(
            id=quote(str(id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Indicator | ProblemDetail | None:
    if response.status_code == 200:
        response_200 = Indicator.from_dict(response.json())

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
) -> Response[Indicator | ProblemDetail]:
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
    body: PatchIndicatorRequest,
) -> Response[Indicator | ProblemDetail]:
    """Partially update indicator in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. `mission_id`
    is intentionally NOT exposed — moving an indicator between missions
    is not supported via this endpoint.

    Args:
        id (UUID):
        body (PatchIndicatorRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied. `mission_id` is intentionally NOT exposed —
            moving an indicator between missions is not supported via this endpoint.
            Same null-vs-absent limitation as the mission patch endpoint.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Indicator | ProblemDetail]
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
    body: PatchIndicatorRequest,
) -> Indicator | ProblemDetail | None:
    """Partially update indicator in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. `mission_id`
    is intentionally NOT exposed — moving an indicator between missions
    is not supported via this endpoint.

    Args:
        id (UUID):
        body (PatchIndicatorRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied. `mission_id` is intentionally NOT exposed —
            moving an indicator between missions is not supported via this endpoint.
            Same null-vs-absent limitation as the mission patch endpoint.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Indicator | ProblemDetail
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
    body: PatchIndicatorRequest,
) -> Response[Indicator | ProblemDetail]:
    """Partially update indicator in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. `mission_id`
    is intentionally NOT exposed — moving an indicator between missions
    is not supported via this endpoint.

    Args:
        id (UUID):
        body (PatchIndicatorRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied. `mission_id` is intentionally NOT exposed —
            moving an indicator between missions is not supported via this endpoint.
            Same null-vs-absent limitation as the mission patch endpoint.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Indicator | ProblemDetail]
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
    body: PatchIndicatorRequest,
) -> Indicator | ProblemDetail | None:
    """Partially update indicator in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. `mission_id`
    is intentionally NOT exposed — moving an indicator between missions
    is not supported via this endpoint.

    Args:
        id (UUID):
        body (PatchIndicatorRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied. `mission_id` is intentionally NOT exposed —
            moving an indicator between missions is not supported via this endpoint.
            Same null-vs-absent limitation as the mission patch endpoint.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Indicator | ProblemDetail
    """

    return (
        await asyncio_detailed(
            id=id,
            client=client,
            body=body,
        )
    ).parsed
