package cycle

import (
	"time"

	"github.com/google/uuid"

	appcycle "github.com/getbud-co/bud2/backend/internal/app/cycle"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

const dateLayout = "2006-01-02"

type createRequest struct {
	Name                  string  `json:"name" validate:"required,min=1,max=200"`
	Type                  string  `json:"type" validate:"required,oneof=quarterly semi_annual annual custom"`
	StartDate             string  `json:"start_date" validate:"required,datetime=2006-01-02"`
	EndDate               string  `json:"end_date" validate:"required,datetime=2006-01-02"`
	Status                string  `json:"status" validate:"required,oneof=planning active review ended archived"`
	OKRDefinitionDeadline *string `json:"okr_definition_deadline" validate:"omitempty,datetime=2006-01-02"`
	MidReviewDate         *string `json:"mid_review_date" validate:"omitempty,datetime=2006-01-02"`
}

type updateRequest struct {
	Name                  string  `json:"name" validate:"required,min=1,max=200"`
	Type                  string  `json:"type" validate:"required,oneof=quarterly semi_annual annual custom"`
	StartDate             string  `json:"start_date" validate:"required,datetime=2006-01-02"`
	EndDate               string  `json:"end_date" validate:"required,datetime=2006-01-02"`
	Status                string  `json:"status" validate:"required,oneof=planning active review ended archived"`
	OKRDefinitionDeadline *string `json:"okr_definition_deadline" validate:"omitempty,datetime=2006-01-02"`
	MidReviewDate         *string `json:"mid_review_date" validate:"omitempty,datetime=2006-01-02"`
}

func parseDate(value string) time.Time {
	parsed, _ := time.Parse(dateLayout, value)
	return parsed
}

func parseOptionalDate(value *string) *time.Time {
	if value == nil {
		return nil
	}
	parsed := parseDate(*value)
	return &parsed
}

func (r createRequest) toCommand(organizationID domain.TenantID) appcycle.CreateCommand {
	return appcycle.CreateCommand{
		OrganizationID:        organizationID,
		Name:                  r.Name,
		Type:                  r.Type,
		StartDate:             parseDate(r.StartDate),
		EndDate:               parseDate(r.EndDate),
		Status:                r.Status,
		OKRDefinitionDeadline: parseOptionalDate(r.OKRDefinitionDeadline),
		MidReviewDate:         parseOptionalDate(r.MidReviewDate),
	}
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) appcycle.UpdateCommand {
	return appcycle.UpdateCommand{
		OrganizationID:        organizationID,
		ID:                    id,
		Name:                  r.Name,
		Type:                  r.Type,
		StartDate:             parseDate(r.StartDate),
		EndDate:               parseDate(r.EndDate),
		Status:                r.Status,
		OKRDefinitionDeadline: parseOptionalDate(r.OKRDefinitionDeadline),
		MidReviewDate:         parseOptionalDate(r.MidReviewDate),
	}
}
