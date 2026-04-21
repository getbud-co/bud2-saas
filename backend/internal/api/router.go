package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/getbud-co/bud2/backend/internal/api/auth"
	"github.com/getbud-co/bud2/backend/internal/api/health"
	"github.com/getbud-co/bud2/backend/internal/api/middleware"
	apiorg "github.com/getbud-co/bud2/backend/internal/api/organization"
	apiuser "github.com/getbud-co/bud2/backend/internal/api/user"
)

type BootstrapHandler interface {
	Create(http.ResponseWriter, *http.Request)
}

type RouterConfig struct {
	Env            string
	AllowedOrigins []string
	OpenAPISpec    []byte
	JWTSecret      string
	Enforcer       middleware.PermissionChecker
	Pool           *pgxpool.Pool
	MaxBodySize    int64
	RequestTimeout time.Duration
}

func NewRouter(bootstrapHandler BootstrapHandler, authHandler *auth.Handler, orgHandler *apiorg.Handler, userHandler *apiuser.Handler, cfg RouterConfig) *chi.Mux {
	r := chi.NewRouter()

	allowedOrigins := cfg.AllowedOrigins
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"http://localhost:3000"}
	}
	for i, o := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(o)
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID"},
		AllowCredentials: true,
	}))
	r.Use(middleware.BodySizeLimit(cfg.MaxBodySize))
	r.Use(chimw.Recoverer)
	r.Use(middleware.TraceMiddleware)
	r.Use(middleware.RequestLogger)

	healthChecker := health.New(cfg.Pool)
	r.Get("/health/live", healthChecker.Live)
	r.Get("/health/ready", healthChecker.Ready)

	if cfg.Env != "production" {
		r.Get("/swagger/", swaggerUIHandler)
		r.Get("/swagger/openapi.yml", openapiSpecHandler(cfg.OpenAPISpec))
	}

	// All non-health routes get request timeout.
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequestTimeout(cfg.RequestTimeout))

		// Public routes with rate limiting
		r.Route("/auth", func(r chi.Router) {
			r.Use(middleware.RateLimit(5, time.Minute)) // 5 requests per minute
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.With(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret})).Get("/session", authHandler.Session)
			r.With(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret})).Put("/session", authHandler.UpdateSession)
		})

		// Bootstrap with stricter rate limiting
		r.With(middleware.RateLimit(3, time.Minute)).Post("/bootstrap", bootstrapHandler.Create)

		r.Route("/organizations", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.With(middleware.RequirePermission(cfg.Enforcer, "org", "create")).Post("/", orgHandler.Create)
			r.With(middleware.RequirePermission(cfg.Enforcer, "org", "read")).Get("/", orgHandler.List)
			r.With(middleware.RequirePermission(cfg.Enforcer, "org", "read")).Get("/{id}", orgHandler.Get)
			r.With(middleware.RequirePermission(cfg.Enforcer, "org", "write")).Put("/{id}", orgHandler.Update)
			r.With(middleware.RequirePermission(cfg.Enforcer, "org", "delete")).Delete("/{id}", orgHandler.Delete)
		})

		r.Route("/users", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.Use(middleware.TenantMiddleware)
			r.Use(middleware.ActiveOrganizationMiddleware(cfg.Pool))
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "write")).Post("/", userHandler.Create)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "read")).Get("/", userHandler.List)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "read")).Get("/{id}", userHandler.Get)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "write")).Put("/{id}", userHandler.Update)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "delete")).Delete("/{id}", userHandler.Delete)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "read")).Get("/{id}/membership", userHandler.GetMembership)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "write")).Put("/{id}/membership", userHandler.UpdateMembership)
		})
	})

	return r
}
