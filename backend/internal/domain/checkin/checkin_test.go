package checkin_test

import (
	"testing"

	checkin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

func TestConfidence_IsValid(t *testing.T) {
	valid := []checkin.Confidence{
		checkin.ConfidenceHigh,
		checkin.ConfidenceMedium,
		checkin.ConfidenceLow,
		checkin.ConfidenceBarrier,
		checkin.ConfidenceDeprioritized,
	}
	for _, c := range valid {
		if !c.IsValid() {
			t.Errorf("expected %q to be valid", c)
		}
	}
	if checkin.Confidence("invalid").IsValid() {
		t.Error("expected 'invalid' to be invalid")
	}
}

func TestCheckIn_Validate(t *testing.T) {
	c := &checkin.CheckIn{Value: "50", Confidence: checkin.ConfidenceHigh}
	if err := c.Validate(); err != nil {
		t.Errorf("expected valid check-in, got %v", err)
	}

	empty := &checkin.CheckIn{Value: "", Confidence: checkin.ConfidenceHigh}
	if err := empty.Validate(); err == nil {
		t.Error("expected error for empty value")
	}

	badConf := &checkin.CheckIn{Value: "50", Confidence: "unknown"}
	if err := badConf.Validate(); err == nil {
		t.Error("expected error for invalid confidence")
	}
}
