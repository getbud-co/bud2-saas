package otel

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

type Config struct {
	Endpoint    string
	ServiceName string
	Environment string
}

type Provider struct {
	TracerProvider *sdktrace.TracerProvider
	MeterProvider  *metric.MeterProvider
	Shutdown       func(context.Context) error
}

func NewProvider(cfg Config) (*Provider, error) {
	ctx := context.Background()

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(cfg.ServiceName),
			semconv.DeploymentEnvironmentKey.String(cfg.Environment),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	var tracerProvider *sdktrace.TracerProvider
	var meterProvider *metric.MeterProvider

	if cfg.Endpoint == "" {
		slog.Info("OTEL endpoint not configured, using no-op exporter")
		tracerProvider = sdktrace.NewTracerProvider(
			sdktrace.WithResource(res),
		)
		meterProvider = metric.NewMeterProvider(
			metric.WithResource(res),
		)
	} else {
		slog.Info("initializing OTEL with OTLP endpoint", "endpoint", cfg.Endpoint)

		traceExporter, err := otlptracehttp.New(ctx,
			otlptracehttp.WithEndpointURL(cfg.Endpoint),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create trace exporter: %w", err)
		}

		tracerProvider = sdktrace.NewTracerProvider(
			sdktrace.WithBatcher(traceExporter),
			sdktrace.WithResource(res),
		)

		metricExporter, err := otlpmetrichttp.New(ctx,
			otlpmetrichttp.WithEndpointURL(cfg.Endpoint),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create metric exporter: %w", err)
		}

		meterProvider = metric.NewMeterProvider(
			metric.WithReader(metric.NewPeriodicReader(metricExporter, metric.WithInterval(60*time.Second))),
			metric.WithResource(res),
		)
	}

	otel.SetTracerProvider(tracerProvider)
	otel.SetMeterProvider(meterProvider)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	shutdown := func(ctx context.Context) error {
		ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		if err := tracerProvider.Shutdown(ctx); err != nil {
			slog.Error("failed to shutdown tracer provider", "error", err)
		}

		if err := meterProvider.Shutdown(ctx); err != nil {
			slog.Error("failed to shutdown meter provider", "error", err)
		}

		return nil
	}

	return &Provider{
		TracerProvider: tracerProvider,
		MeterProvider:  meterProvider,
		Shutdown:       shutdown,
	}, nil
}

func init() {
	if os.Getenv("OTEL_LOG_LEVEL") == "debug" {
		otel.SetErrorHandler(otel.ErrorHandlerFunc(func(err error) {
			slog.Error("OTEL error", "error", err)
		}))
	}
}
