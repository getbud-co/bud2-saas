package testutil

import (
	"io"
	"log/slog"
)

func NewDiscardLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(io.Discard, nil))
}
