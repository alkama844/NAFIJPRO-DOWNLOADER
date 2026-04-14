package httptransport

import (
	"net/http"

	"downaria-api/internal/core/config"
	apperrors "downaria-api/internal/core/errors"
	"downaria-api/internal/transport/http/handlers"
	"downaria-api/internal/transport/http/middleware"
	"downaria-api/pkg/response"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func NewRouter(h *handlers.Handler, cfg config.Config) http.Handler {
	originProtected := middleware.RequireOrigin(cfg.AllowedOrigins)
	antiBot := middleware.BlockBotAccess()
	webSignature := middleware.RequireWebSignature(cfg.WebInternalSharedSecret)
	mergeEnabled := middleware.RequireMergeEnabled(cfg.MergeEnabled)
	r := chi.NewRouter()

	r.Use(chimiddleware.Recoverer)

	r.NotFound(func(w http.ResponseWriter, req *http.Request) {
		response.WriteErrorRequest(w, req, apperrors.HTTPStatus(apperrors.CodeNotFound), apperrors.CodeNotFound, "route not found, available prefixes are /api/v1/ (public) and /api/web/ (frontend)")
	})

	r.MethodNotAllowed(func(w http.ResponseWriter, req *http.Request) {
		response.WriteErrorRequest(w, req, apperrors.HTTPStatus(apperrors.CodeMethodNotAllowed), apperrors.CodeMethodNotAllowed, "method not allowed on this path")
	})

	r.Get("/", h.Root)
	r.Get("/health", h.Health)
	r.Options("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	r.Get("/api/settings", h.Settings)
	r.Options("/api/settings", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	r.Get("/api/v1/stats/public", h.PublicStats)
	r.Options("/api/v1/stats/public", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	r.Get("/api/v1/status", h.Status)
	r.Options("/api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	r.Get("/api/v1/communications", h.Communications)
	r.Options("/api/v1/communications", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	r.Get("/metrics", h.Metrics)
	r.Options("/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	r.Route("/api/web", func(web chi.Router) {
		web.Use(originProtected)
		web.Use(webSignature)
		web.Use(antiBot)
		web.Post("/extract", h.Extract)
		web.Options("/extract", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
		web.Get("/proxy", h.Proxy)
		web.Options("/proxy", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
		web.Get("/download", h.Download)
		web.Options("/download", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
		web.With(mergeEnabled).Post("/merge", h.Merge)
		web.Options("/merge", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
	})

	// Public API routes - protected by CORS + rate limiting
	r.Route("/api/v1", func(v1 chi.Router) {
		v1.Post("/extract", h.Extract)
		v1.Options("/extract", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
		v1.Get("/proxy", h.Proxy)
		v1.Options("/proxy", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
		v1.Get("/download", h.Download)
		v1.Options("/download", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
		v1.With(mergeEnabled).Post("/merge", h.Merge)
		v1.Options("/merge", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})

		// Chat endpoint
		v1.Post("/chat", h.Chat)
		v1.Options("/chat", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
	})

	// Admin API Key routes
	r.Route("/api/admin", func(admin chi.Router) {
		admin.Post("/api-keys/create", h.CreateAPIKey)
		admin.Get("/api-keys", h.ListAPIKeys)
		admin.Delete("/api-keys", h.DeleteAPIKey)
		admin.Get("/api-keys/stats", h.GetAPIKeyStats)
	})
