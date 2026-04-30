package tag

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/api/validator"
)

func TestCreateRequest_Validate_Success(t *testing.T) {
	req := createRequest{Name: "Engineering", Color: "orange"}
	assert.NoError(t, validator.Validate(req))
}

func TestCreateRequest_Validate_MissingName_ReturnsError(t *testing.T) {
	req := createRequest{Name: "", Color: "neutral"}
	assert.Error(t, validator.Validate(req))
}

func TestCreateRequest_Validate_InvalidColor_ReturnsError(t *testing.T) {
	req := createRequest{Name: "Engineering", Color: "purple"}
	assert.Error(t, validator.Validate(req))
}

func TestCreateRequest_Validate_AllColors(t *testing.T) {
	colors := []string{"neutral", "orange", "wine", "caramel", "success", "warning", "error"}
	for _, color := range colors {
		req := createRequest{Name: "tag", Color: color}
		assert.NoError(t, validator.Validate(req), "color=%s should be valid", color)
	}
}
