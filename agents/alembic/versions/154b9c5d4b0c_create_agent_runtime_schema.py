"""create agent runtime schema

Revision ID: 154b9c5d4b0c
Revises:
Create Date: 2026-04-30 16:30:04.316128

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "154b9c5d4b0c"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS agents")

    op.create_table(
        "channel_connections",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("external_account_id", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("channel", "external_account_id", name="uq_channel_external_account"),
        schema="agents",
    )

    op.create_table(
        "conversations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("external_conversation_id", sa.String(), nullable=False),
        sa.Column("external_user_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id", "channel", "external_conversation_id",
            name="uq_org_channel_external_conv",
        ),
        schema="agents",
    )

    op.create_table(
        "webhook_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=True),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("external_event_id", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=False),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("channel", "external_event_id", name="uq_channel_external_event"),
        schema="agents",
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("direction", sa.String(), nullable=False),
        sa.Column("external_message_id", sa.String(), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["agents.conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("channel", "external_message_id", name="uq_channel_external_message"),
        schema="agents",
    )

    op.create_table(
        "agent_runs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("inbound_message_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["agents.conversations.id"]),
        sa.ForeignKeyConstraint(["inbound_message_id"], ["agents.messages.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="agents",
    )

    op.create_table(
        "delivery_outbox",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(), nullable=False),
        sa.Column("locked_at", sa.DateTime(), nullable=True),
        sa.Column("locked_by", sa.String(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["agents.messages.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="agents",
    )

    op.create_table(
        "tool_calls",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("agent_run_id", sa.UUID(), nullable=False),
        sa.Column("tool_name", sa.String(), nullable=False),
        sa.Column("arguments", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["agent_run_id"], ["agents.agent_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="agents",
    )

    op.create_index(
        "idx_webhook_events_received_at",
        "webhook_events",
        ["received_at"],
        schema="agents",
    )
    op.create_index(
        "idx_channel_connections_org",
        "channel_connections",
        ["organization_id"],
        schema="agents",
    )
    op.create_index(
        "idx_conversations_external_user",
        "conversations",
        ["organization_id", "channel", "external_user_id"],
        schema="agents",
    )
    op.create_index(
        "idx_messages_conversation",
        "messages",
        ["organization_id", "conversation_id", "created_at"],
        schema="agents",
    )
    op.create_index(
        "idx_agent_runs_status",
        "agent_runs",
        ["organization_id", "status", "created_at"],
        schema="agents",
    )
    op.create_index(
        "idx_delivery_outbox_pending",
        "delivery_outbox",
        ["organization_id", "status", "next_attempt_at"],
        schema="agents",
    )


def downgrade() -> None:
    op.drop_table("tool_calls", schema="agents")
    op.drop_table("delivery_outbox", schema="agents")
    op.drop_table("agent_runs", schema="agents")
    op.drop_table("messages", schema="agents")
    op.drop_table("webhook_events", schema="agents")
    op.drop_table("conversations", schema="agents")
    op.drop_table("channel_connections", schema="agents")
    op.execute("DROP SCHEMA IF EXISTS agents CASCADE")
