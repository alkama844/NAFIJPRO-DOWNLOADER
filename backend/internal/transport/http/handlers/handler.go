package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strings"
	"time"

	"downaria-api/internal/app/services/extraction"
	"downaria-api/internal/core/config"
	"downaria-api/internal/core/ports"
	"downaria-api/internal/extractors"
	"downaria-api/internal/extractors/registry"
	"downaria-api/internal/infra/cache"
	"downaria-api/internal/infra/merge"
	"downaria-api/internal/infra/metrics"
	"downaria-api/internal/infra/network"
	"downaria-api/internal/infra/persistence"
	"downaria-api/internal/shared/security"
	"downaria-api/internal/shared/util"

	"golang.org/x/sync/singleflight"
)

type Handler struct {
	config     config.Config
	startedAt  time.Time
	httpClient *http.Client
	statsStore ports.StatsStore
	Streamer   *network.Streamer
	extractor  extraction.Service
	headCache  *cache.TTLCache
	clientIPFn func(*http.Request) string
	urlGuard   *security.OutboundURLValidator
	headGroup  singleflight.Group

	headDeduplicator     *cache.HeadDeduplicator
	bufferPool           *network.BufferPool
	streamingDownloader  *network.StreamingDownloader
	concurrentDownloader *network.ConcurrentDownloader
	mergePool            *merge.MergeWorkerPool
	metrics              *metrics.ContentDeliveryMetrics

	db *sql.DB
}

type statsStoreCloser interface {
	Close() error
}

type handlerHTTPClients struct {
	guarded   *http.Client
	streaming *http.Client
	urlGuard  *security.OutboundURLValidator
}

func NewHandler(cfg config.Config, startedAt time.Time) *Handler {
	reg := registry.NewRegistry()

	extractors.RegisterDefaultExtractors(reg)

	baseExtractor := extraction.NewService(reg, 30, cfg.ExtractionMaxRetries, cfg.ExtractionRetryDelayMs)
	cachedExtractor := extraction.NewCachedService(baseExtractor, cache.NewPlatformTTLConfig(cfg.CacheExtractionTTL, cfg.CacheExtractionPlatformTTLs))
	trustedProxies := parseTrustedProxies(cfg)
	httpClients := newHandlerHTTPClients(cfg)
	bufferPool := network.NewBufferPool()
	metricsCollector := metrics.NewContentDeliveryMetrics()
	mergePool := newMergePool(cfg, metricsCollector)

	return &Handler{
		config:     cfg,
		startedAt:  startedAt,
		httpClient: httpClients.guarded,
		statsStore: newStatsStore(cfg, startedAt),
		Streamer:   network.NewStreamerWithClient(httpClients.streaming),
		extractor:  cachedExtractor,
		headCache:  cache.NewTTLCacheWithMaxEntries(2048),
		clientIPFn: func(r *http.Request) string {
			return util.ClientIPFromRequestWithTrustedProxies(r, trustedProxies)
		},
		urlGuard:             httpClients.urlGuard,
		headDeduplicator:     cache.NewHeadDeduplicator(httpClients.guarded, cfg.CacheProxyHeadTTL, 2048),
		bufferPool:           bufferPool,
		streamingDownloader:  network.NewStreamingDownloader(bufferPool),
		concurrentDownloader: network.NewConcurrentDownloader(httpClients.streaming),
		mergePool:            mergePool,
		metrics:              metricsCollector,
	}
}

func parseTrustedProxies(cfg config.Config) *util.IPAllowlist {
	trustedProxies, err := util.NewIPAllowlist(cfg.TrustedProxyCIDRs)
	if err != nil {
		return nil
	}
	return trustedProxies
}

func newHandlerHTTPClients(cfg config.Config) handlerHTTPClients {
	urlGuard := security.NewOutboundURLValidator(nil)
	requestTimeout := cfg.UpstreamTimeout
	if requestTimeout <= 0 {
		requestTimeout = 10 * time.Second
	}
	transportOptions := network.HTTPClientOptions{
		DialTimeout:           upstreamTransportTimeout(cfg.UpstreamConnectTimeout, requestTimeout),
		KeepAliveTimeout:      upstreamTransportTimeout(cfg.UpstreamKeepAliveTimeout, 30*time.Second),
		TLSHandshakeTimeout:   upstreamTransportTimeout(cfg.UpstreamTLSHandshakeTimeout, requestTimeout),
		ResponseHeaderTimeout: upstreamTransportTimeout(cfg.UpstreamResponseHeaderTimeout, requestTimeout),
		IdleConnTimeout:       upstreamTransportTimeout(cfg.UpstreamIdleConnTimeout, 90*time.Second),
		Validator:             urlGuard,
	}
	guardedClient := network.NewHTTPClientWithOptions(network.HTTPClientOptions{
		RequestTimeout:        requestTimeout,
		DialTimeout:           transportOptions.DialTimeout,
		KeepAliveTimeout:      transportOptions.KeepAliveTimeout,
		TLSHandshakeTimeout:   transportOptions.TLSHandshakeTimeout,
		ResponseHeaderTimeout: transportOptions.ResponseHeaderTimeout,
		IdleConnTimeout:       transportOptions.IdleConnTimeout,
		Validator:             transportOptions.Validator,
	})
	streamingClient := network.NewHTTPClientWithOptions(network.HTTPClientOptions{
		RequestTimeout:        0,
		DialTimeout:           transportOptions.DialTimeout,
		KeepAliveTimeout:      transportOptions.KeepAliveTimeout,
		TLSHandshakeTimeout:   transportOptions.TLSHandshakeTimeout,
		ResponseHeaderTimeout: transportOptions.ResponseHeaderTimeout,
		IdleConnTimeout:       transportOptions.IdleConnTimeout,
		Validator:             transportOptions.Validator,
	})

	return handlerHTTPClients{
		guarded:   guardedClient,
		streaming: streamingClient,
		urlGuard:  urlGuard,
	}
}

func newStatsStore(cfg config.Config, startedAt time.Time) ports.StatsStore {
	return persistence.NewPublicStatsStore(startedAt, persistence.PublicStatsPersistenceOptions{
		Enabled:        cfg.StatsPersistEnabled,
		FilePath:       cfg.StatsPersistFilePath,
		FlushInterval:  cfg.StatsPersistFlushInterval,
		FlushThreshold: cfg.StatsPersistFlushThreshold,
	})
}

func newMergePool(cfg config.Config, metricsCollector *metrics.ContentDeliveryMetrics) *merge.MergeWorkerPool {
	mergeWorkerCount := cfg.MergeWorkerCount
	if mergeWorkerCount <= 0 {
		mergeWorkerCount = 3
	}
	var mergePool *merge.MergeWorkerPool
	if cfg.ConcurrentMergeEnabled {
		mergePool = merge.NewMergeWorkerPool(mergeWorkerCount, 10, merge.NewStreamingMerger("", int64(cfg.MaxMergeOutputSizeMB)*1024*1024))
		metricsCollector.SetMergeQueueCapacity(mergePool.QueueCapacity())
		metricsCollector.SetMergeQueueDepth(mergePool.QueueDepth())
	}

	return mergePool
}

func upstreamTransportTimeout(value, fallback time.Duration) time.Duration {
	if value > 0 {
		return value
	}
	return fallback
}

func (h *Handler) SetDatabase(db *sql.DB) {
	h.db = db

	// Load public admin cookies into the extractor's server cookie lanes so they are available
	if h.db != nil && h.extractor != nil {
		rows, err := h.db.Query(`
			SELECT platform, value FROM admin_cookies
			WHERE deleted_at IS NULL AND enabled = TRUE AND visibility = 'public' AND (expire_at IS NULL OR expire_at > NOW())
		`)
		if err == nil {
			defer rows.Close()
			serverCookies := map[string]string{}
			for rows.Next() {
				var platform, value string
				if err := rows.Scan(&platform, &value); err != nil {
					continue
				}
				if platform != "" && value != "" {
					serverCookies[strings.ToLower(strings.TrimSpace(platform))] = strings.TrimSpace(value)
				}
			}
			// Recreate extractor service with server cookies configured
			// Keep defaults: timeout 30, and use existing extractor registry
			reg := registry.NewRegistry()
			extractors.RegisterDefaultExtractors(reg)
			baseExtractor := extraction.NewService(reg, 30, h.config.ExtractionMaxRetries, h.config.ExtractionRetryDelayMs, extraction.WithServerCookies(serverCookies))
			cachedExtractor := extraction.NewCachedService(baseExtractor, cache.NewPlatformTTLConfig(h.config.CacheExtractionTTL, h.config.CacheExtractionPlatformTTLs))
			h.extractor = cachedExtractor
		}
	}
}

func (h *Handler) Close() error {
	if h.mergePool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = h.mergePool.Shutdown(ctx)
	}
	closer, ok := h.statsStore.(statsStoreCloser)
	if !ok {
		return nil
	}
	return closer.Close()
}

// Chat endpoint handler
func (h *Handler) Chat(w http.ResponseWriter, r *http.Request) {
	chatHandler := NewChatHandler()
	chatHandler.Chat(w, r)
}

// API Key handlers
func (h *Handler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	apiKeyHandler := NewAPIKeyHandler(h.db)
	apiKeyHandler.CreateAPIKey(w, r)
}

func (h *Handler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	apiKeyHandler := NewAPIKeyHandler(h.db)
	apiKeyHandler.ListAPIKeys(w, r)
}

func (h *Handler) DeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	apiKeyHandler := NewAPIKeyHandler(h.db)
	apiKeyHandler.DeleteAPIKey(w, r)
}

func (h *Handler) GetAPIKeyStats(w http.ResponseWriter, r *http.Request) {
	apiKeyHandler := NewAPIKeyHandler(h.db)
	apiKeyHandler.GetKeyStats(w, r)
}

// Cookie handlers
func (h *Handler) ListCookies(w http.ResponseWriter, r *http.Request) {
	cookieHandler := NewCookieHandler(h.db)
	cookieHandler.ListCookies(w, r)
}

func (h *Handler) CreateCookie(w http.ResponseWriter, r *http.Request) {
	cookieHandler := NewCookieHandler(h.db)
	cookieHandler.CreateCookie(w, r)
}

func (h *Handler) DeleteCookie(w http.ResponseWriter, r *http.Request) {
	cookieHandler := NewCookieHandler(h.db)
	cookieHandler.DeleteCookie(w, r)
}
