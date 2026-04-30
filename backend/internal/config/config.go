package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port            string
	DatabaseURL     string
	Env             string
	AllowedOrigins  string
	JWTSecret       string
	PolicyModel     string
	PolicyFile      string
	OTelEndpoint    string
	OTelServiceName string
	OTelEnvironment string
	LogLevel        string
	MaxBodySize     int64
	RequestTimeout  time.Duration
	ShutdownTimeout time.Duration
	TokenTTL        time.Duration
	RefreshTokenTTL time.Duration
}

func Load() *Config {
	cfg := &Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		Env:             getEnv("ENV", "development"),
		AllowedOrigins:  getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"),
		JWTSecret:       getEnv("JWT_SECRET", ""),
		PolicyModel:     getEnv("POLICY_MODEL", "./policies/model.conf"),
		PolicyFile:      getEnv("POLICY_FILE", "./policies/policy.csv"),
		OTelEndpoint:    getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		OTelServiceName: getEnv("OTEL_SERVICE_NAME", "bud2-backend"),
		OTelEnvironment: getEnv("OTEL_ENVIRONMENT", "development"),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
		MaxBodySize:     getEnvInt64("MAX_BODY_SIZE", 1048576), // 1 MB default
		RequestTimeout:  getEnvDuration("REQUEST_TIMEOUT", 30*time.Second),
		ShutdownTimeout: getEnvDuration("SHUTDOWN_TIMEOUT", 30*time.Second),
		TokenTTL:        getEnvDuration("TOKEN_TTL", 8*time.Hour),
		RefreshTokenTTL: getEnvDuration("REFRESH_TOKEN_TTL", 7*24*time.Hour),
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
