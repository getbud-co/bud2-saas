from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from bud2.infra.postgres.models import ChannelConnection, Conversation
from bud2.infra.postgres.repositories import (
    ChannelConnectionRepository,
    ConversationRepository,
    MessageRepository,
    WebhookEventRepository,
)


@pytest.mark.asyncio
class TestChannelConnectionRepository:
    async def test_get_by_external_user_found(self, db_session: AsyncSession) -> None:
        repo = ChannelConnectionRepository(db_session)
        org_id = uuid.uuid4()
        conn = ChannelConnection(
            organization_id=org_id,
            channel="whatsapp",
            external_account_id="5511999999999",
            status="active",
        )
        db_session.add(conn)
        await db_session.commit()

        result = await repo.get_by_external_user("whatsapp", "5511999999999")

        assert result is not None
        assert result.organization_id == org_id

    async def test_get_by_external_user_not_found(self, db_session: AsyncSession) -> None:
        repo = ChannelConnectionRepository(db_session)
        result = await repo.get_by_external_user("whatsapp", "00000000000")
        assert result is None


@pytest.mark.asyncio
class TestConversationRepository:
    async def test_get_or_create_creates_new(self, db_session: AsyncSession) -> None:
        repo = ConversationRepository(db_session)
        org_id = uuid.uuid4()

        conv = await repo.get_or_create(
            channel="whatsapp",
            external_conversation_id="123:5511999999999",
            external_user_id="5511999999999",
            organization_id=org_id,
        )

        assert conv.organization_id == org_id
        assert conv.external_conversation_id == "123:5511999999999"

    async def test_get_or_create_returns_existing(self, db_session: AsyncSession) -> None:
        repo = ConversationRepository(db_session)
        org_id = uuid.uuid4()

        first = await repo.get_or_create(
            channel="whatsapp",
            external_conversation_id="123:5511999999999",
            external_user_id="5511999999999",
            organization_id=org_id,
        )
        second = await repo.get_or_create(
            channel="whatsapp",
            external_conversation_id="123:5511999999999",
            external_user_id="5511999999999",
            organization_id=org_id,
        )

        assert first.id == second.id


@pytest.mark.asyncio
class TestMessageRepository:
    async def test_save_and_list(self, db_session: AsyncSession) -> None:
        repo = MessageRepository(db_session)
        org_id = uuid.uuid4()
        conv = Conversation(
            organization_id=org_id,
            channel="whatsapp",
            external_conversation_id="123:5511999999999",
            external_user_id="5511999999999",
        )
        db_session.add(conv)
        await db_session.flush()

        await repo.save(
            organization_id=org_id,
            conversation_id=conv.id,
            channel="whatsapp",
            direction="inbound",
            text="Hello",
        )
        await repo.save(
            organization_id=org_id,
            conversation_id=conv.id,
            channel="whatsapp",
            direction="outbound",
            text="Hi there",
        )
        await db_session.commit()

        messages = await repo.list_by_conversation(conv.id)
        assert len(messages) == 2
        texts = [m.text for m in messages]
        assert "Hello" in texts
        assert "Hi there" in texts


@pytest.mark.asyncio
class TestWebhookEventRepository:
    async def test_create_if_new(self, db_session: AsyncSession) -> None:
        repo = WebhookEventRepository(db_session)

        created = await repo.create_if_new(
            channel="whatsapp",
            external_event_id="evt-123",
            payload={"entry": []},
        )
        assert created is True

        duplicate = await repo.create_if_new(
            channel="whatsapp",
            external_event_id="evt-123",
            payload={"entry": []},
        )
        assert duplicate is False
