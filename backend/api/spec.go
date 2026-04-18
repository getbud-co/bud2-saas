package apispec

import _ "embed"

// Spec holds the OpenAPI specification embedded at compile time.
//
//go:embed openapi.yml
var Spec []byte
