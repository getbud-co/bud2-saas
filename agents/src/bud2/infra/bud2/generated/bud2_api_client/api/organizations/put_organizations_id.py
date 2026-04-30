from http import HTTPStatus
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.organization import Organization
from ...models.problem_detail import ProblemDetail
from ...models.update_organization_request import UpdateOrganizationRequest
from ...types import Response


def _get_kwargs(
    id: UUID,
    *,
    body: UpdateOrganizationRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/organizations/{id}".format(
            id=quote(str(id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Organization | ProblemDetail | None:
    if response.status_code == 200:
        response_200 = Organization.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = ProblemDetail.from_dict(response.json())

        return response_401

    if response.status_code == 404:
        response_404 = ProblemDetail.from_dict(response.json())

        return response_404

    if response.status_code == 409:
        response_409 = ProblemDetail.from_dict(response.json())

        return response_409

    if response.status_code == 422:
        response_422 = ProblemDetail.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Organization | ProblemDetail]:
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
    body: UpdateOrganizationRequest,
) -> Response[Organization | ProblemDetail]:
    """Update organization

     Updates the organization only if it is accessible to the authenticated user. Inaccessible
    organizations return 404. System admins may update any organization.

    Args:
        id (UUID):
        body (UpdateOrganizationRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Organization | ProblemDetail]
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
    body: UpdateOrganizationRequest,
) -> Organization | ProblemDetail | None:
    """Update organization

     Updates the organization only if it is accessible to the authenticated user. Inaccessible
    organizations return 404. System admins may update any organization.

    Args:
        id (UUID):
        body (UpdateOrganizationRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Organization | ProblemDetail
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
    body: UpdateOrganizationRequest,
) -> Response[Organization | ProblemDetail]:
    """Update organization

     Updates the organization only if it is accessible to the authenticated user. Inaccessible
    organizations return 404. System admins may update any organization.

    Args:
        id (UUID):
        body (UpdateOrganizationRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Organization | ProblemDetail]
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
    body: UpdateOrganizationRequest,
) -> Organization | ProblemDetail | None:
    """Update organization

     Updates the organization only if it is accessible to the authenticated user. Inaccessible
    organizations return 404. System admins may update any organization.

    Args:
        id (UUID):
        body (UpdateOrganizationRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Organization | ProblemDetail
    """

    return (
        await asyncio_detailed(
            id=id,
            client=client,
            body=body,
        )
    ).parsed
