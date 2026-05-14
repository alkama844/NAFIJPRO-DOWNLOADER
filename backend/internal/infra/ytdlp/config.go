package ytdlp

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type YtDlpConfig struct {
	UseAndroidEmulation bool
	CookieString        string
	CookieFile          string
	DebugMode           bool
}

type YtDlpCommand struct {
	args []string
}

// NewYtDlpCommand creates a new yt-dlp command builder
func NewYtDlpCommand() *YtDlpCommand {
	return &YtDlpCommand{args: []string{"yt-dlp"}}
}

// WithAndroidEmulation configures yt-dlp to use Android client
// This bypasses YouTube's bot detection and renders blocking
func (c *YtDlpCommand) WithAndroidEmulation() *YtDlpCommand {
	c.args = append(c.args,
		"--player-client=android",                        // Use Android client
		"--extractor-args=youtube:player_client=android", // Explicitly set for YouTube
	)
	return c
}

// WithCookie adds cookie authentication
// Priority: cookie file (preferred) > cookie string
func (c *YtDlpCommand) WithCookie(cfg *YtDlpConfig) (*YtDlpCommand, error) {
	if cfg == nil {
		return c, nil
	}

	// Use cookie file if available (more reliable)
	if cfg.CookieFile != "" {
		// Verify file exists
		if _, err := os.Stat(cfg.CookieFile); err == nil {
			c.args = append(c.args, "--cookies", cfg.CookieFile)
			return c, nil
		}
	}

	// Fallback to cookie string - create temporary file
	if cfg.CookieString != "" {
		tempDir := "/tmp"
		cookieFile := filepath.Join(tempDir, "ytdlp_cookies_"+randomString(8)+".txt")

		// Write cookie string to temporary file
		if err := ioutil.WriteFile(cookieFile, []byte(cfg.CookieString), 0600); err != nil {
			return c, fmt.Errorf("failed to write cookie file: %v", err)
		}

		c.args = append(c.args, "--cookies", cookieFile)
		// Note: caller is responsible for cleanup using c.GetCookieFile()
		return c, nil
	}

	return c, nil
}

// WithURL adds the video URL
func (c *YtDlpCommand) WithURL(url string) *YtDlpCommand {
	c.args = append(c.args, url)
	return c
}

// WithFormat specifies the format
func (c *YtDlpCommand) WithFormat(format string) *YtDlpCommand {
	if format != "" {
		c.args = append(c.args, "-f", format)
	}
	return c
}

// WithOutput sets the output template
func (c *YtDlpCommand) WithOutput(template string) *YtDlpCommand {
	if template != "" {
		c.args = append(c.args, "-o", template)
	}
	return c
}

// WithQuiet suppresses output
func (c *YtDlpCommand) WithQuiet() *YtDlpCommand {
	c.args = append(c.args, "-q")
	return c
}

// WithDebug enables debug output
func (c *YtDlpCommand) WithDebug() *YtDlpCommand {
	c.args = append(c.args, "--verbose")
	return c
}

// WithExtractAudio extracts audio to MP3
func (c *YtDlpCommand) WithExtractAudio() *YtDlpCommand {
	c.args = append(c.args,
		"-x",                    // Extract audio
		"--audio-format", "mp3", // Convert to mp3
		"--audio-quality", "192",
	)
	return c
}

// WithJsonOutput returns video info as JSON
func (c *YtDlpCommand) WithJsonOutput() *YtDlpCommand {
	c.args = append(c.args, "-j") // JSON output
	return c
}

// WithFlatPlaylist flattens playlist
func (c *YtDlpCommand) WithFlatPlaylist() *YtDlpCommand {
	c.args = append(c.args, "--flat-playlist")
	return c
}

// Build returns the command string
func (c *YtDlpCommand) Build() []string {
	return c.args
}

// Execute runs the yt-dlp command and returns stdout
func (c *YtDlpCommand) Execute() (string, string, error) {
	cmd := exec.Command(c.args[0], c.args[1:]...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	return stdout.String(), stderr.String(), err
}

// ExecuteWithEnv runs the command with custom environment variables
func (c *YtDlpCommand) ExecuteWithEnv(env []string) (string, string, error) {
	cmd := exec.Command(c.args[0], c.args[1:]...)
	cmd.Env = append(os.Environ(), env...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	return stdout.String(), stderr.String(), err
}

// GetCookieFile extracts cookie file path from args for cleanup
func (c *YtDlpCommand) GetCookieFile() string {
	for i, arg := range c.args {
		if arg == "--cookies" && i+1 < len(c.args) {
			return c.args[i+1]
		}
	}
	return ""
}

// CleanupCookieFile removes temporary cookie file if created
func (c *YtDlpCommand) CleanupCookieFile() error {
	cookieFile := c.GetCookieFile()
	if cookieFile != "" && strings.Contains(cookieFile, "ytdlp_cookies_") {
		return os.Remove(cookieFile)
	}
	return nil
}

// Helper function for random string generation
func randomString(length int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = chars[i%len(chars)]
	}
	return string(b)
}

// DownloadVideo downloads a video with cookies
func DownloadVideo(url string, cookieConfig *YtDlpConfig, outputDir string) (string, error) {
	outputPath := filepath.Join(outputDir, "%(title)s.%(ext)s")

	cmd := NewYtDlpCommand().
		WithAndroidEmulation().
		WithFormat("best").
		WithOutput(outputPath).
		WithQuiet()

	if cookieConfig != nil && (cookieConfig.CookieFile != "" || cookieConfig.CookieString != "") {
		var err error
		cmd, err = cmd.WithCookie(cookieConfig)
		if err != nil {
			return "", err
		}
	}

	cmd.WithURL(url)

	stdout, stderr, err := cmd.Execute()
	defer cmd.CleanupCookieFile()

	if err != nil {
		return "", fmt.Errorf("yt-dlp execution failed: %v - stderr: %s", err, stderr)
	}

	return stdout, nil
}

// GetVideoInfo extracts video information as JSON
func GetVideoInfo(url string, cookieConfig *YtDlpConfig) (string, error) {
	cmd := NewYtDlpCommand().
		WithAndroidEmulation().
		WithJsonOutput().
		WithQuiet()

	if cookieConfig != nil && (cookieConfig.CookieFile != "" || cookieConfig.CookieString != "") {
		var err error
		cmd, err = cmd.WithCookie(cookieConfig)
		if err != nil {
			return "", err
		}
	}

	cmd.WithURL(url)

	stdout, stderr, err := cmd.Execute()
	defer cmd.CleanupCookieFile()

	if err != nil {
		return "", fmt.Errorf("failed to get video info: %v - stderr: %s", err, stderr)
	}

	return stdout, nil
}
