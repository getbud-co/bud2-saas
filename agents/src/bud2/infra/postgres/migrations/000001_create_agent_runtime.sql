CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS agents;

CREATE TABLE agents.channel_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'teams')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled', 'error')),
    external_account_id TEXT NOT NULL,
    display_name TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, channel, external_account_id),
    UNIQUE (channel, external_account_id)
);

CREATE TABLE agents.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'teams')),
    external_event_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    UNIQUE (channel, external_event_id)
);

CREATE TABLE agents.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'teams')),
    external_conversation_id TEXT NOT NULL,
    external_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, channel, external_conversation_id)
);

CREATE TABLE agents.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    conversation_id UUID NOT NULL REFERENCES agents.conversations(id),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'teams')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    external_message_id TEXT,
    text TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (channel, external_message_id)
);

CREATE TABLE agents.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    conversation_id UUID NOT NULL REFERENCES agents.conversations(id),
    inbound_message_id UUID REFERENCES agents.messages(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agents.tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_run_id UUID NOT NULL REFERENCES agents.agent_runs(id),
    tool_name TEXT NOT NULL,
    arguments JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE agents.delivery_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    message_id UUID NOT NULL REFERENCES agents.messages(id),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'teams')),
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead')),
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_received_at ON agents.webhook_events (received_at);
CREATE INDEX idx_channel_connections_org ON agents.channel_connections (organization_id);
CREATE INDEX idx_conversations_external_user ON agents.conversations (organization_id, channel, external_user_id);
CREATE INDEX idx_messages_conversation ON agents.messages (organization_id, conversation_id, created_at);
CREATE INDEX idx_agent_runs_status ON agents.agent_runs (organization_id, status, created_at);
CREATE INDEX idx_delivery_outbox_pending ON agents.delivery_outbox (organization_id, status, next_attempt_at);
