package mission

import (
	"time"

	"github.com/google/uuid"

	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

type Response struct {
	ID           string  `json:"id"`
	OrgID        string  `json:"org_id"`
	CycleID      *string `json:"cycle_id"`
	ParentID     *string `json:"parent_id"`
	OwnerID      string  `json:"owner_id"`
	TeamID       *string `json:"team_id"`
	Title        string  `json:"title"`
	Description  *string `json:"description"`
	Status       string  `json:"status"`
	Visibility   string  `json:"visibility"`
	KanbanStatus string  `json:"kanban_status"`
	SortOrder    int     `json:"sort_order"`
	DueDate      *string `json:"due_date"`
	CompletedAt  *string `json:"completed_at"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(m *domainmission.Mission) Response {
	return Response{
		ID:           m.ID.String(),
		OrgID:        m.OrganizationID.String(),
		CycleID:      uuidPtrString(m.CycleID),
		ParentID:     uuidPtrString(m.ParentID),
		OwnerID:      m.OwnerID.String(),
		TeamID:       uuidPtrString(m.TeamID),
		Title:        m.Title,
		Description:  m.Description,
		Status:       string(m.Status),
		Visibility:   string(m.Visibility),
		KanbanStatus: string(m.KanbanStatus),
		SortOrder:    m.SortOrder,
		DueDate:      formatOptionalDate(m.DueDate),
		CompletedAt:  formatOptionalTimestamp(m.CompletedAt),
		CreatedAt:    m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    m.UpdatedAt.Format(time.RFC3339),
	}
}

func uuidPtrString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}

func formatOptionalDate(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format(dateLayout)
	return &formatted
}

func formatOptionalTimestamp(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format(time.RFC3339)
	return &formatted
}
