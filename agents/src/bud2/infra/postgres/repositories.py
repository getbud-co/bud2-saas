from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from bud2.infra.postgres.models import (
    ChannelConnection,
    Conversation,
    Message,
    WebhookEvent,
)


class ChannelConnectionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_external_user(
        self, channel: str, external_account_id: str
    ) -> ChannelConnection | None:
        result = await self._session.execute(
            select(ChannelConnection).where(
                ChannelConnection.channel == channel,
                ChannelConnection.external_account_id == external_account_id,
            )
        )
        return result.scalar_one_or_none()


class ConversationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_or_create(
        self,
        channel: str,
        external_conversation_id: str,
        external_user_id: str,
        organization_id: uuid.UUID,
    ) -> Conversation:
        result = await self._session.execute(
            select(Conversation).where(
                Conversation.channel == channel,
                Conversation.external_conversation_id == external_conversation_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if conversation is None:
            conversation = Conversation(
                organization_id=organization_id,
                channel=channel,
                external_conversation_id=external_conversation_id,
                external_user_id=external_user_id,
            )
            self._session.add(conversation)
            await self._session.flush()
        return conversation


class MessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(
        self,
        organization_id: uuid.UUID,
        conversation_id: uuid.UUID,
        channel: str,
        direction: str,
        text: str,
        external_message_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> Message:
        message = Message(
            organization_id=organization_id,
            conversation_id=conversation_id,
            channel=channel,
            direction=direction,
            text=text,
            external_message_id=external_message_id,
            payload=payload or {},
        )
        self._session.add(message)
        await self._session.flush()
        return message

    async def list_by_conversation(
        self, conversation_id: uuid.UUID, limit: int = 20
    ) -> list[Message]:
        result = await self._session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())


class WebhookEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_if_new(
        self,
        *,
        channel: str,
        external_event_id: str,
        payload: dict[str, Any],
    ) -> bool:
        result = await self._session.execute(
            select(WebhookEvent).where(
                WebhookEvent.channel == channel,
                WebhookEvent.external_event_id == external_event_id,
            )
        )
        if result.scalar_one_or_none() is not None:
            return False

        event = WebhookEvent(
            channel=channel,
            external_event_id=external_event_id,
            payload=payload,
        )
        self._session.add(event)
        await self._session.flush()
        return True
