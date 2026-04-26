package mission_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"

	apispec "github.com/getbud-co/bud2/backend/api"
)

// TestOpenAPI_MissionsPaths_Document400 guards against handler ↔ contract drift:
// the missions handler emits 400 on invalid UUIDs (path or query) and on the
// status enum query filter, but until recently the OpenAPI spec only listed
// 401/403/404/422. This locks the four paths that emit 400 to advertise it.
func TestOpenAPI_MissionsPaths_Document400(t *testing.T) {
	type response struct {
		Description string `yaml:"description"`
	}
	type op struct {
		Responses map[string]response `yaml:"responses"`
	}
	type pathItem struct {
		Get    *op `yaml:"get"`
		Put    *op `yaml:"put"`
		Patch  *op `yaml:"patch"`
		Post   *op `yaml:"post"`
		Delete *op `yaml:"delete"`
	}
	type spec struct {
		Paths map[string]pathItem `yaml:"paths"`
	}

	var s spec
	require.NoError(t, yaml.Unmarshal(apispec.Spec, &s))

	// Each entry: (path, http method) that the handler may answer with 400.
	mustHave400 := []struct {
		path, method string
	}{
		{"/missions", "GET"},
		{"/missions/{id}", "GET"},
		{"/missions/{id}", "PUT"},
		{"/missions/{id}", "PATCH"},
		{"/missions/{id}", "DELETE"},
	}

	for _, entry := range mustHave400 {
		item, ok := s.Paths[entry.path]
		require.Truef(t, ok, "spec missing path %s", entry.path)

		var operation *op
		switch entry.method {
		case "GET":
			operation = item.Get
		case "PUT":
			operation = item.Put
		case "PATCH":
			operation = item.Patch
		case "POST":
			operation = item.Post
		case "DELETE":
			operation = item.Delete
		}

		// Skip silently if the method does not exist on this path (e.g.,
		// PUT vs PATCH selection). The other variant of the same path will
		// cover the 400 contract.
		if operation == nil {
			continue
		}
		_, has400 := operation.Responses["400"]
		require.Truef(t, has400, "%s %s must document a 400 response", entry.method, entry.path)
	}
}
