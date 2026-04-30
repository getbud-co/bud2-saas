package checkin

import (
	"time"

	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

type Response struct {
	ID            string          `json:"id"`
	OrgID         string          `json:"org_id"`
	IndicatorID   string          `json:"indicator_id"`
	AuthorID      string          `json:"author_id"`
	Value         string          `json:"value"`
	PreviousValue *string         `json:"previous_value"`
	Confidence    string          `json:"confidence"`
	Note          *string         `json:"note"`
	Mentions      []string        `json:"mentions"`
	CreatedAt     string          `json:"created_at"`
	UpdatedAt     string          `json:"updated_at"`
	Author        *AuthorResponse `json:"author,omitempty"`
}

type AuthorResponse struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(c *domaincheckin.CheckIn) Response {
	resp := Response{
		ID:            c.ID.String(),
		OrgID:         c.OrgID.String(),
		IndicatorID:   c.IndicatorID.String(),
		AuthorID:      c.AuthorID.String(),
		Value:         c.Value,
		PreviousValue: c.PreviousValue,
		Confidence:    string(c.Confidence),
		Note:          c.Note,
		Mentions:      c.Mentions,
		CreatedAt:     c.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     c.UpdatedAt.Format(time.RFC3339),
	}
	if c.AuthorName != nil {
		resp.Author = &AuthorResponse{
			ID:        c.AuthorID.String(),
			FirstName: c.AuthorName.FirstName,
			LastName:  c.AuthorName.LastName,
		}
	}
	return resp
}

func toListResponse(result domaincheckin.ListResult) ListResponse {
	items := make([]Response, len(result.CheckIns))
	for i := range result.CheckIns {
		items[i] = toResponse(&result.CheckIns[i])
	}
	return ListResponse{Data: items, Total: result.Total, Page: result.Page, Size: result.Size}
}
