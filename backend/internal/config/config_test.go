package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestLoad_UsesDefaults(t *testing.T) {
	t.Setenv("PORT", "")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("ENV", "")
	t.Setenv("CORS_ALLOWED_ORIGINS", "")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("POLICY_MODEL", "")
	t.Setenv("POLICY_FILE", "")
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	t.Setenv("OTEL_SERVICE_NAME", "")
	t.Setenv("OTEL_ENVIRONMENT", "")
	t.Setenv("LOG_LEVEL", "")
	t.Setenv("MAX_BODY_SIZE", "")
	t.Setenv("REQUEST_TIMEOUT", "")
	t.Setenv("SHUTDOWN_TIMEOUT", "")

	cfg := Load()

	assert.Equal(t, "8080", cfg.Port)
	assert.Equal(t, "development", cfg.Env)
	assert.Equal(t, "http://localhost:3000", cfg.AllowedOrigins)
	assert.Equal(t, "./policies/model.conf", cfg.PolicyModel)
	assert.Equal(t, "./policies/policy.csv", cfg.PolicyFile)
	assert.Equal(t, int64(1048576), cfg.MaxBodySize)
	assert.Equal(t, 30*time.Second, cfg.RequestTimeout)
	assert.Equal(t, 30*time.Second, cfg.ShutdownTimeout)
}

func TestLoad_UsesConfiguredValuesAndFallsBackOnInvalidNumbers(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("DATABASE_URL", "postgres://db")
	t.Setenv("ENV", "test")
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
	t.Setenv("JWT_SECRET", "secret")
	t.Setenv("POLICY_MODEL", "/tmp/model.conf")
	t.Setenv("POLICY_FILE", "/tmp/policy.csv")
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel:4318")
	t.Setenv("OTEL_SERVICE_NAME", "bud2-test")
	t.Setenv("OTEL_ENVIRONMENT", "ci")
	t.Setenv("LOG_LEVEL", "debug")
	t.Setenv("MAX_BODY_SIZE", "invalid")
	t.Setenv("REQUEST_TIMEOUT", "15s")
	t.Setenv("SHUTDOWN_TIMEOUT", "invalid")

	cfg := Load()

	assert.Equal(t, "9090", cfg.Port)
	assert.Equal(t, "postgres://db", cfg.DatabaseURL)
	assert.Equal(t, "test", cfg.Env)
	assert.Equal(t, "http://localhost:5173", cfg.AllowedOrigins)
	assert.Equal(t, "secret", cfg.JWTSecret)
	assert.Equal(t, "/tmp/model.conf", cfg.PolicyModel)
	assert.Equal(t, "/tmp/policy.csv", cfg.PolicyFile)
	assert.Equal(t, "http://otel:4318", cfg.OTelEndpoint)
	assert.Equal(t, "bud2-test", cfg.OTelServiceName)
	assert.Equal(t, "ci", cfg.OTelEnvironment)
	assert.Equal(t, "debug", cfg.LogLevel)
	assert.Equal(t, int64(1048576), cfg.MaxBodySize)
	assert.Equal(t, 15*time.Second, cfg.RequestTimeout)
	assert.Equal(t, 30*time.Second, cfg.ShutdownTimeout)
}
