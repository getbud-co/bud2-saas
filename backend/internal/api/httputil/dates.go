package httputil

import "time"

// DateLayout is the canonical YYYY-MM-DD format every resource uses for
// date-only fields (mission/indicator/task due_date, etc.). Centralised
// here so the date format on the wire stays consistent across resources.
const DateLayout = "2006-01-02"

// FormatOptionalDate renders an optional date as a *string in DateLayout
// format, returning nil when the input is nil. Matches the JSON shape
// expected by the OpenAPI schemas (`{ type: string, format: date,
// nullable: true }`).
func FormatOptionalDate(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format(DateLayout)
	return &formatted
}

// FormatOptionalTimestamp renders an optional timestamp as RFC 3339, which
// is what `format: date-time` resolves to in JSON Schema. Returns nil when
// the input is nil.
func FormatOptionalTimestamp(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format(time.RFC3339)
	return &formatted
}

// ParseOptionalDate parses a *string in DateLayout, returning nil when the
// input is nil OR when parsing fails. The "fail = nil" path is intentional:
// upstream validation (go-playground/validator) already rejects malformed
// dates with a 422 before this function runs, so a parse failure here can
// only mean the field was absent or empty.
func ParseOptionalDate(value *string) *time.Time {
	if value == nil {
		return nil
	}
	parsed, err := time.Parse(DateLayout, *value)
	if err != nil {
		return nil
	}
	return &parsed
}
