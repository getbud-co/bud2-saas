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
	apicycle "github.com/getbud-co/bud2/backend/internal/api/cycle"
	"github.com/getbud-co/bud2/backend/internal/api/health"
	apiindicator "github.com/getbud-co/bud2/backend/internal/api/indicator"
	"github.com/getbud-co/bud2/backend/internal/api/middleware"
	apimission "github.com/getbud-co/bud2/backend/internal/api/mission"
	apiorg "github.com/getbud-co/bud2/backend/internal/api/organization"
	apiperm "github.com/getbud-co/bud2/backend/internal/api/permission"
	apirole "github.com/getbud-co/bud2/backend/internal/api/role"
	apitask "github.com/getbud-co/bud2/backend/internal/api/task"
	apiteam "github.com/getbud-co/bud2/backend/internal/api/team"
	apiuser "github.com/getbud-co/bud2/backend/internal/api/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
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

func NewRouter(bootstrapHandler BootstrapHandler, authHandler *auth.Handler, orgHandler *apiorg.Handler, userHandler *apiuser.Handler, teamHandler *apiteam.Handler, roleHandler *apirole.Handler, permissionHandler *apiperm.Handler, cycleHandler *apicycle.Handler, missionHandler *apimission.Handler, indicatorHandler *apiindicator.Handler, taskHandler *apitask.Handler, cfg RouterConfig) *chi.Mux {
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
			r.Use(middleware.ActiveOrganizationMiddleware(sqlc.New(cfg.Pool)))
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "write")).Post("/", userHandler.Create)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "read")).Get("/", userHandler.List)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "read")).Get("/{id}", userHandler.Get)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "write")).Put("/{id}", userHandler.Update)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "delete")).Delete("/{id}", userHandler.Delete)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "read")).Get("/{id}/membership", userHandler.GetMembership)
			r.With(middleware.RequirePermission(cfg.Enforcer, "users", "write")).Put("/{id}/membership", userHandler.UpdateMembership)
		})

		r.Route("/teams", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.Use(middleware.TenantMiddleware)
			r.Use(middleware.ActiveOrganizationMiddleware(sqlc.New(cfg.Pool)))
			r.With(middleware.RequirePermission(cfg.Enforcer, "teams", "write")).Post("/", teamHandler.Create)
			r.With(middleware.RequirePermission(cfg.Enforcer, "teams", "read")).Get("/", teamHandler.List)
			r.With(middleware.RequirePermission(cfg.Enforcer, "teams", "read")).Get("/{id}", teamHandler.Get)
			r.With(middleware.RequirePermission(cfg.Enforcer, "teams", "write")).Put("/{id}", teamHandler.Update)
			r.With(middleware.RequirePermission(cfg.Enforcer, "teams", "delete")).Delete("/{id}", teamHandler.Delete)
		})

		r.Route("/roles", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.Use(middleware.TenantMiddleware)
			r.Use(middleware.ActiveOrganizationMiddleware(sqlc.New(cfg.Pool)))
			r.With(middleware.RequirePermission(cfg.Enforcer, "settings", "read")).Get("/", roleHandler.List)
		})

		r.Route("/permissions", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.Use(middleware.TenantMiddleware)
			r.Use(middleware.ActiveOrganizationMiddleware(sqlc.New(cfg.Pool)))
			r.With(middleware.RequirePermission(cfg.Enforcer, "settings", "read")).Get("/", permissionHandler.List)
		})

		r.Route("/cycles", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.Use(middleware.TenantMiddleware)
			r.Use(middleware.ActiveOrganizationMiddleware(sqlc.New(cfg.Pool)))
			r.With(middleware.RequirePermission(cfg.Enforcer, "settings", "write")).Post("/", cycleHandler.Create)
			r.With(middleware.RequirePermission(cfg.Enforcer, "settings", "read")).Get("/", cycleHandler.List)
			r.With(middleware.RequirePermission(cfg.Enforcer, "settings", "read")).Get("/{id}", cycleHandler.Get)
			r.With(middleware.RequirePermission(cfg.Enforcer, "settings", "write")).Put("/{id}", cycleHandler.Update)
			r.With(middleware.RequirePermission(cfg.Enforcer, "settings", "write")).Delete("/{id}", cycleHandler.Delete)
		})

		r.Route("/missions", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.Use(middleware.TenantMiddleware)
			r.Use(middleware.ActiveOrganizationMiddleware(sqlc.New(cfg.Pool)))
			r.With(middleware.RequirePermission(cfg.Enforcer, "missions", "write")).Post("/", missionHandler.Create)
			r.With(middleware.RequirePermission(cfg.Enforcer, "missions", "read")).Get("/", missionHandler.List)
			r.With(middleware.RequirePermission(cfg.Enforcer, "missions", "read")).Get("/{id}", missionHandler.Get)
			r.With(middleware.RequirePermission(cfg.Enforcer, "missions", "write")).Patch("/{id}", missionHandler.Update)
			r.With(middleware.RequirePermission(cfg.Enforcer, "missions", "delete")).Delete("/{id}", missionHandler.Delete)
		})

		r.Route("/indicators", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.Use(middleware.TenantMiddleware)
			r.Use(middleware.ActiveOrganizationMiddleware(sqlc.New(cfg.Pool)))
			r.With(middleware.RequirePermission(cfg.Enforcer, "indicators", "write")).Post("/", indicatorHandler.Create)
			r.With(middleware.RequirePermission(cfg.Enforcer, "indicators", "read")).Get("/", indicatorHandler.List)
			r.With(middleware.RequirePermission(cfg.Enforcer, "indicators", "read")).Get("/{id}", indicatorHandler.Get)
			r.With(middleware.RequirePermission(cfg.Enforcer, "indicators", "write")).Patch("/{id}", indicatorHandler.Update)
			r.With(middleware.RequirePermission(cfg.Enforcer, "indicators", "delete")).Delete("/{id}", indicatorHandler.Delete)
		})

		r.Route("/tasks", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(middleware.AuthMiddlewareConfig{JWTSecret: cfg.JWTSecret}))
			r.Use(middleware.TenantMiddleware)
			r.Use(middleware.ActiveOrganizationMiddleware(sqlc.New(cfg.Pool)))
			r.With(middleware.RequirePermission(cfg.Enforcer, "tasks", "write")).Post("/", taskHandler.Create)
			r.With(middleware.RequirePermission(cfg.Enforcer, "tasks", "read")).Get("/", taskHandler.List)
			r.With(middleware.RequirePermission(cfg.Enforcer, "tasks", "read")).Get("/{id}", taskHandler.Get)
			r.With(middleware.RequirePermission(cfg.Enforcer, "tasks", "write")).Patch("/{id}", taskHandler.Update)
			r.With(middleware.RequirePermission(cfg.Enforcer, "tasks", "delete")).Delete("/{id}", taskHandler.Delete)
		})
	})

	return r
}
