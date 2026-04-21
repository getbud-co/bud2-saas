package httputil

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDecodeJSON_Success(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(`{"name":"bud2"}`))
	rr := httptest.NewRecorder()
	var payload map[string]string

	ok := DecodeJSON(rr, req, &payload)

	assert.True(t, ok)
	assert.Equal(t, "bud2", payload["name"])
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestDecodeJSON_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(`{"name":`))
	rr := httptest.NewRecorder()
	var payload map[string]string

	ok := DecodeJSON(rr, req, &payload)

	assert.False(t, ok)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	var problem map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &problem))
	assert.Equal(t, "Bad Request", problem["title"])
}

func TestDecodeJSON_PayloadTooLarge(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(`{"name":"bud2"}`))
	rr := httptest.NewRecorder()
	req.Body = http.MaxBytesReader(rr, req.Body, 1)
	var payload map[string]string

	ok := DecodeJSON(rr, req, &payload)

	assert.False(t, ok)
	assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)
}
