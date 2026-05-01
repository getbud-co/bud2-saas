package tag

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

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

func TestNewTag_GeneratesIDAndValidates(t *testing.T) {
	orgID := uuid.New()
	tg, err := NewTag(orgID, "Engineering", ColorOrange)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, tg.ID)
	assert.Equal(t, orgID, tg.OrganizationID)
	assert.Equal(t, "Engineering", tg.Name)
	assert.Equal(t, ColorOrange, tg.Color)
}

func TestNewTag_IDIsAlwaysGenerated(t *testing.T) {
	t1, _ := NewTag(uuid.New(), "A", ColorNeutral)
	t2, _ := NewTag(uuid.New(), "B", ColorNeutral)
	assert.NotEqual(t, uuid.Nil, t1.ID)
	assert.NotEqual(t, t1.ID, t2.ID)
}

func TestNewTag_EmptyName_ReturnsValidationError(t *testing.T) {
	_, err := NewTag(uuid.New(), "", ColorNeutral)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewTag_InvalidColor_ReturnsValidationError(t *testing.T) {
	_, err := NewTag(uuid.New(), "valid", Color("purple"))
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestTag_Rename_UpdatesName(t *testing.T) {
	tg, _ := NewTag(uuid.New(), "Old", ColorNeutral)
	require.NoError(t, tg.Rename("New"))
	assert.Equal(t, "New", tg.Name)
}

func TestTag_Rename_EmptyName_ReturnsError(t *testing.T) {
	tg, _ := NewTag(uuid.New(), "Valid", ColorNeutral)
	err := tg.Rename("")
	assert.ErrorIs(t, err, domain.ErrValidation)
	assert.Equal(t, "Valid", tg.Name)
}

func TestTag_ChangeColor_UpdatesColor(t *testing.T) {
	tg, _ := NewTag(uuid.New(), "T", ColorNeutral)
	require.NoError(t, tg.ChangeColor(ColorOrange))
	assert.Equal(t, ColorOrange, tg.Color)
}

func TestTag_ChangeColor_InvalidColor_ReturnsError(t *testing.T) {
	tg, _ := NewTag(uuid.New(), "T", ColorNeutral)
	err := tg.ChangeColor(Color("purple"))
	assert.ErrorIs(t, err, domain.ErrValidation)
	assert.Equal(t, ColorNeutral, tg.Color)
}
