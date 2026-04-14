package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

// Connect establishes a connection to PostgreSQL database with IPv4 preference
func Connect(databaseURL string) (*sql.DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	// Ensure sslmode is set for security
	if !strings.Contains(databaseURL, "sslmode") {
		if strings.Contains(databaseURL, "?") {
			databaseURL += "&sslmode=disable"
		} else {
			databaseURL += "?sslmode=disable"
		}
	}

	// When using lib/pq, we need to handle DNS resolution to prefer IPv4
	// Create a resolver that prefers IPv4
	orig := net.DefaultResolver
	net.DefaultResolver = &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			// Force IPv4 resolution
			d := &net.Dialer{
				Timeout:       time.Second * 5,
				FallbackDelay: -1, // Disable IPv6 entirely
			}
			return d.DialContext(ctx, "tcp4", address)
		},
	}
	defer func() {
		net.DefaultResolver = orig
	}()

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database (check IPv4 connectivity): %w", err)
	}

	log.Println("✓ Database connected successfully (IPv4 forced)")
	return db, nil
}

// Close closes the database connection
func Close(db *sql.DB) error {
	if db == nil {
		return nil
	}
	return db.Close()
}
