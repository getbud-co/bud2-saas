package checkin

import (
	"github.com/google/uuid"

	appcheckin "github.com/getbud-co/bud2/backend/internal/app/checkin"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type createRequest struct {
	IndicatorID   uuid.UUID `json:"indicator_id" validate:"required"`
	AuthorID      uuid.UUID `json:"author_id" validate:"required"`
	Value         string    `json:"value" validate:"required,min=1"`
	PreviousValue *string   `json:"previous_value"`
	Confidence    string    `json:"confidence" validate:"required,oneof=high medium low barrier deprioritized"`
	Note          *string   `json:"note"`
	Mentions      []string  `json:"mentions"`
}

func (r createRequest) toCommand(orgID domain.TenantID) appcheckin.CreateCommand {
	return appcheckin.CreateCommand{
		OrgID:         orgID,
		IndicatorID:   r.IndicatorID,
		AuthorID:      r.AuthorID,
		Value:         r.Value,
		PreviousValue: r.PreviousValue,
		Confidence:    r.Confidence,
		Note:          r.Note,
		Mentions:      r.Mentions,
	}
}

type updateRequest struct {
	Value      string   `json:"value" validate:"required,min=1"`
	Confidence string   `json:"confidence" validate:"required,oneof=high medium low barrier deprioritized"`
	Note       *string  `json:"note"`
	Mentions   []string `json:"mentions"`
}

func (r updateRequest) toCommand(orgID domain.TenantID, id uuid.UUID) appcheckin.UpdateCommand {
	return appcheckin.UpdateCommand{
		OrgID:      orgID,
		ID:         id,
		Value:      r.Value,
		Confidence: r.Confidence,
		Note:       r.Note,
		Mentions:   r.Mentions,
	}
}
