from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ChannelConnection(Base):
    __tablename__ = "channel_connections"
    __table_args__ = (
        UniqueConstraint("channel", "external_account_id", name="uq_channel_external_account"),
        {"schema": "agents"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    channel: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    external_account_id: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    config: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    __table_args__ = (
        UniqueConstraint("channel", "external_event_id", name="uq_channel_external_event"),
        {"schema": "agents"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    channel: Mapped[str] = mapped_column(String, nullable=False)
    external_event_id: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    received_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(nullable=True)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "channel", "external_conversation_id",
            name="uq_org_channel_external_conv",
        ),
        {"schema": "agents"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    channel: Mapped[str] = mapped_column(String, nullable=False)
    external_conversation_id: Mapped[str] = mapped_column(String, nullable=False)
    external_user_id: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    messages: Mapped[list[Message]] = relationship(
        "Message", back_populates="conversation", order_by="Message.created_at"
    )
    agent_runs: Mapped[list[AgentRun]] = relationship("AgentRun", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        UniqueConstraint("channel", "external_message_id", name="uq_channel_external_message"),
        {"schema": "agents"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.conversations.id"), nullable=False
    )
    channel: Mapped[str] = mapped_column(String, nullable=False)
    direction: Mapped[str] = mapped_column(String, nullable=False)
    external_message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    conversation: Mapped[Conversation] = relationship("Conversation", back_populates="messages")


class AgentRun(Base):
    __tablename__ = "agent_runs"
    __table_args__ = ({"schema": "agents"},)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.conversations.id"), nullable=False
    )
    inbound_message_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agents.messages.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    conversation: Mapped[Conversation] = relationship(
        "Conversation", back_populates="agent_runs"
    )
    tool_calls: Mapped[list[ToolCall]] = relationship("ToolCall", back_populates="agent_run")


class ToolCall(Base):
    __tablename__ = "tool_calls"
    __table_args__ = ({"schema": "agents"},)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.agent_runs.id"), nullable=False
    )
    tool_name: Mapped[str] = mapped_column(String, nullable=False)
    arguments: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    result: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    agent_run: Mapped[AgentRun] = relationship("AgentRun", back_populates="tool_calls")


class DeliveryOutbox(Base):
    __tablename__ = "delivery_outbox"
    __table_args__ = ({"schema": "agents"},)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.messages.id"), nullable=False
    )
    channel: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    attempts: Mapped[int] = mapped_column(default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    locked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    locked_by: Mapped[str | None] = mapped_column(String, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
