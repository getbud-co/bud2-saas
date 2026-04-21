package main

import (
	"context"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInitLogger_UsesRequestedLevel(t *testing.T) {
	logger := initLogger("development", "debug")

	assert.True(t, logger.Enabled(context.Background(), slog.LevelDebug))
	assert.True(t, logger.Enabled(context.Background(), slog.LevelInfo))
}

func TestInitLogger_FallsBackToInfoForUnknownLevel(t *testing.T) {
	logger := initLogger("development", "unknown")

	assert.False(t, logger.Enabled(context.Background(), slog.LevelDebug))
	assert.True(t, logger.Enabled(context.Background(), slog.LevelInfo))
}

func TestInitDBPool_InvalidURLReturnsError(t *testing.T) {
	pool, err := initDBPool(context.Background(), "invalid-url")

	require.Error(t, err)
	assert.Nil(t, pool)
}
