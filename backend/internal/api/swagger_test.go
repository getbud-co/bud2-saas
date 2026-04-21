package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSwaggerUIHandler_WritesHTML(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/swagger/", nil)
	rr := httptest.NewRecorder()

	swaggerUIHandler(rr, req)

	assert.Equal(t, "text/html; charset=utf-8", rr.Header().Get("Content-Type"))
	assert.NotEmpty(t, rr.Body.Bytes())
}

func TestOpenAPISpecHandler_WritesSpec(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/swagger/openapi.yml", nil)
	rr := httptest.NewRecorder()

	openapiSpecHandler([]byte("openapi: 3.1.0"))(rr, req)

	assert.Equal(t, "application/yaml", rr.Header().Get("Content-Type"))
	assert.Equal(t, "openapi: 3.1.0", rr.Body.String())
}
