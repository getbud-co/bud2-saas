package validator

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()

	// Register custom validation for slug (kebab-case: lowercase letters, numbers, hyphens)
	_ = validate.RegisterValidation("slug", func(fl validator.FieldLevel) bool {
		slug := fl.Field().String()
		if slug == "" {
			return true // Let 'required' handle empty strings
		}
		matched, _ := regexp.MatchString(`^[a-z0-9]+(?:-[a-z0-9]+)*$`, slug)
		return matched
	})
}

// Validate validates a struct using validator tags
func Validate(s interface{}) error {
	return validate.Struct(s)
}

// FormatValidationErrors converts validator errors into a user-friendly message
func FormatValidationErrors(err error) string {
	if err == nil {
		return ""
	}

	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return err.Error()
	}

	var messages []string
	for _, e := range validationErrors {
		field := e.Field()
		tag := e.Tag()
		param := e.Param()

		msg := formatError(field, tag, param)
		messages = append(messages, msg)
	}

	return strings.Join(messages, "; ")
}

func formatError(field, tag, param string) string {
	switch tag {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, param)
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", field, param)
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, param)
	case "slug":
		return fmt.Sprintf("%s must contain only lowercase letters, numbers, and hyphens", field)
	default:
		return fmt.Sprintf("%s failed validation: %s", field, tag)
	}
}
