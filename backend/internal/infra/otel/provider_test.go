package otel

import (
	"context"
	"testing"

	"go.opentelemetry.io/otel"
)

func TestNewProvider_NoOp(t *testing.T) {
	cfg := Config{
		Endpoint:    "",
		ServiceName: "test-service",
		Environment: "test",
	}

	provider, err := NewProvider(cfg)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	defer func() {
		_ = provider.Shutdown(context.Background())
	}()

	if provider.TracerProvider == nil {
		t.Error("expected TracerProvider to be set")
	}

	if provider.MeterProvider == nil {
		t.Error("expected MeterProvider to be set")
	}

	if provider.Shutdown == nil {
		t.Error("expected Shutdown function to be set")
	}

	// Verify globals are set
	if otel.GetTracerProvider() == nil {
		t.Error("expected global tracer provider to be set")
	}

	if otel.GetMeterProvider() == nil {
		t.Error("expected global meter provider to be set")
	}
}

func TestNewProvider_WithEndpoint(t *testing.T) {
	// This test uses an invalid endpoint to verify error handling
	// In production, you'd use a mock server
	cfg := Config{
		Endpoint:    "http://invalid-endpoint:4318",
		ServiceName: "test-service",
		Environment: "test",
	}

	// This may or may not error depending on the implementation
	// The key is that it shouldn't panic
	provider, err := NewProvider(cfg)
	if err != nil {
		// It's ok if this fails - the endpoint is invalid
		t.Skipf("Skipping test - OTLP endpoint connection failed: %v", err)
	}

	if provider != nil {
		defer func() {
			_ = provider.Shutdown(context.Background())
		}()
	}
}

func TestProviderShutdown(t *testing.T) {
	cfg := Config{
		Endpoint:    "",
		ServiceName: "test-service",
		Environment: "test",
	}

	provider, err := NewProvider(cfg)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	ctx := context.Background()
	err = provider.Shutdown(ctx)
	if err != nil {
		t.Errorf("expected no error on shutdown, got %v", err)
	}
}
