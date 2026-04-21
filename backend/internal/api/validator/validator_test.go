package validator

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidate(t *testing.T) {
	type TestStruct struct {
		Name  string `validate:"required,min=2,max=10"`
		Email string `validate:"required,email"`
	}

	tests := []struct {
		name    string
		input   TestStruct
		wantErr bool
	}{
		{
			name:    "valid struct",
			input:   TestStruct{Name: "John", Email: "john@example.com"},
			wantErr: false,
		},
		{
			name:    "missing name",
			input:   TestStruct{Name: "", Email: "john@example.com"},
			wantErr: true,
		},
		{
			name:    "name too short",
			input:   TestStruct{Name: "J", Email: "john@example.com"},
			wantErr: true,
		},
		{
			name:    "name too long",
			input:   TestStruct{Name: "John Doe Smith", Email: "john@example.com"},
			wantErr: true,
		},
		{
			name:    "invalid email",
			input:   TestStruct{Name: "John", Email: "invalid-email"},
			wantErr: true,
		},
		{
			name:    "missing email",
			input:   TestStruct{Name: "John", Email: ""},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidate_Slug(t *testing.T) {
	type TestStruct struct {
		Slug string `validate:"slug"`
	}

	tests := []struct {
		name    string
		slug    string
		wantErr bool
	}{
		{"valid slug simple", "test", false},
		{"valid slug with hyphens", "test-slug", false},
		{"valid slug with numbers", "test-123", false},
		{"valid slug numbers only", "123", false},
		{"valid slug empty", "", false}, // Empty is allowed (use 'required' to enforce)
		{"invalid slug uppercase", "Test-Slug", true},
		{"invalid slug spaces", "test slug", true},
		{"invalid slug underscore", "test_slug", true},
		{"invalid slug special", "test@slug", true},
		{"invalid slug starts with hyphen", "-test", true},
		{"invalid slug ends with hyphen", "test-", true},
		{"invalid slug double hyphen", "test--slug", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := TestStruct{Slug: tt.slug}
			err := Validate(s)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidate_SlugWithRequired(t *testing.T) {
	type TestStruct struct {
		Slug string `validate:"required,slug"`
	}

	tests := []struct {
		name    string
		slug    string
		wantErr bool
	}{
		{"valid slug", "test-slug", false},
		{"empty slug", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := TestStruct{Slug: tt.slug}
			err := Validate(s)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidate_FQDN(t *testing.T) {
	type TestStruct struct {
		Domain string `validate:"fqdn"`
	}

	tests := []struct {
		name    string
		domain  string
		wantErr bool
	}{
		{"valid domain", "example.com", false},
		{"valid subdomain", "sub.example.co.uk", false},
		{"valid with numbers", "test123.example.com", false},
		{"valid with trailing dot", "example.com.", false},
		{"empty fails fqdn", "", true},
		{"invalid with space", "not a domain", true},
		{"invalid starts with hyphen", "-invalid.com", true},
		{"invalid single label", "localhost", true},
		{"invalid with at sign", "admin@example.com", true},
		{"invalid with protocol", "http://example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := TestStruct{Domain: tt.domain}
			err := Validate(s)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestFormatValidationErrors_FQDN(t *testing.T) {
	type TestStruct struct {
		Domain string `validate:"required,fqdn"`
	}

	s := TestStruct{Domain: "not valid"}
	err := Validate(s)
	got := FormatValidationErrors(err)
	assert.Contains(t, got, "Domain must be a valid domain name")
}

func TestFormatValidationErrors(t *testing.T) {
	type TestStruct struct {
		Name  string `validate:"required,min=5"`
		Email string `validate:"required,email"`
	}

	tests := []struct {
		name string
		obj  TestStruct
		want string
	}{
		{
			name: "required error",
			obj:  TestStruct{Name: "", Email: ""},
			want: "Name is required; Email is required",
		},
		{
			name: "min length error",
			obj:  TestStruct{Name: "AB", Email: "test@example.com"},
			want: "Name must be at least 5 characters",
		},
		{
			name: "email format error",
			obj:  TestStruct{Name: "ValidName", Email: "invalid"},
			want: "Email must be a valid email address",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.obj)
			got := FormatValidationErrors(err)
			assert.Contains(t, got, tt.want)
		})
	}
}

func TestFormatValidationErrors_NilError(t *testing.T) {
	result := FormatValidationErrors(nil)
	assert.Empty(t, result)
}

func TestFormatValidationErrors_NonValidationError(t *testing.T) {
	result := FormatValidationErrors(assert.AnError)
	assert.Equal(t, assert.AnError.Error(), result)
}

func TestFormatValidationErrors_OneOf(t *testing.T) {
	type TestStruct struct {
		Role string `validate:"oneof=admin manager collaborator"`
	}

	s := TestStruct{Role: "invalid"}
	err := Validate(s)
	got := FormatValidationErrors(err)
	assert.Contains(t, got, "Role must be one of: admin manager collaborator")
}
