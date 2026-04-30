from http import HTTPStatus
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.patch_task_request import PatchTaskRequest
from ...models.problem_detail import ProblemDetail
from ...models.task import Task
from ...types import Response


def _get_kwargs(
    id: UUID,
    *,
    body: PatchTaskRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/tasks/{id}".format(
            id=quote(str(id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ProblemDetail | Task | None:
    if response.status_code == 200:
        response_200 = Task.from_dict(response.json())

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
) -> Response[ProblemDetail | Task]:
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
    body: PatchTaskRequest,
) -> Response[ProblemDetail | Task]:
    """Partially update task in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. `mission_id`
    is intentionally NOT exposed — moving a task between missions is not
    supported via this endpoint.

    Args:
        id (UUID):
        body (PatchTaskRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied. `mission_id` is intentionally NOT exposed.
            `indicator_id` can be set to re-assign the task within the same
            mission; clearing it (moving back to the mission root) requires a
            future endpoint that supports null/absent distinction.
            completed_at is managed by the server based on status transitions.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ProblemDetail | Task]
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
    body: PatchTaskRequest,
) -> ProblemDetail | Task | None:
    """Partially update task in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. `mission_id`
    is intentionally NOT exposed — moving a task between missions is not
    supported via this endpoint.

    Args:
        id (UUID):
        body (PatchTaskRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied. `mission_id` is intentionally NOT exposed.
            `indicator_id` can be set to re-assign the task within the same
            mission; clearing it (moving back to the mission root) requires a
            future endpoint that supports null/absent distinction.
            completed_at is managed by the server based on status transitions.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ProblemDetail | Task
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
    body: PatchTaskRequest,
) -> Response[ProblemDetail | Task]:
    """Partially update task in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. `mission_id`
    is intentionally NOT exposed — moving a task between missions is not
    supported via this endpoint.

    Args:
        id (UUID):
        body (PatchTaskRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied. `mission_id` is intentionally NOT exposed.
            `indicator_id` can be set to re-assign the task within the same
            mission; clearing it (moving back to the mission root) requires a
            future endpoint that supports null/absent distinction.
            completed_at is managed by the server based on status transitions.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ProblemDetail | Task]
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
    body: PatchTaskRequest,
) -> ProblemDetail | Task | None:
    """Partially update task in active organization

     JSON Merge Patch semantics (RFC 7396): only fields present in the body
    are applied; absent fields preserve their current value. `mission_id`
    is intentionally NOT exposed — moving a task between missions is not
    supported via this endpoint.

    Args:
        id (UUID):
        body (PatchTaskRequest): JSON Merge Patch body. All fields are optional; only fields
            present in
            the request are applied. `mission_id` is intentionally NOT exposed.
            `indicator_id` can be set to re-assign the task within the same
            mission; clearing it (moving back to the mission root) requires a
            future endpoint that supports null/absent distinction.
            completed_at is managed by the server based on status transitions.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ProblemDetail | Task
    """

    return (
        await asyncio_detailed(
            id=id,
            client=client,
            body=body,
        )
    ).parsed
