package tag

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestTag_Validate_Success(t *testing.T) {
	tag := &Tag{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		Name:           "Engineering",
		Color:          ColorOrange,
	}
	assert.NoError(t, tag.Validate())
}

func TestTag_Validate_EmptyName_ReturnsValidationError(t *testing.T) {
	tag := &Tag{Name: "", Color: ColorNeutral}
	assert.ErrorIs(t, tag.Validate(), domain.ErrValidation)
}

func TestTag_Validate_NameTooLong_ReturnsValidationError(t *testing.T) {
	tag := &Tag{Name: strings.Repeat("a", 101), Color: ColorNeutral}
	assert.ErrorIs(t, tag.Validate(), domain.ErrValidation)
}

func TestTag_Validate_InvalidColor_ReturnsValidationError(t *testing.T) {
	tag := &Tag{Name: "valid", Color: Color("purple")}
	assert.ErrorIs(t, tag.Validate(), domain.ErrValidation)
}

func TestTag_Validate_NameExactlyMaxLength_Success(t *testing.T) {
	tag := &Tag{Name: strings.Repeat("a", 100), Color: ColorSuccess}
	assert.NoError(t, tag.Validate())
}
