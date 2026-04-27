package task

import (
	"time"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

type Response struct {
	ID          string  `json:"id"`
	OrgID       string  `json:"org_id"`
	MissionID   string  `json:"mission_id"`
	IndicatorID *string `json:"indicator_id"`
	AssigneeID  string  `json:"assignee_id"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	Status      string  `json:"status"`
	DueDate     *string `json:"due_date"`
	CompletedAt *string `json:"completed_at"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(t *domaintask.Task) Response {
	var indicatorID *string
	if t.IndicatorID != nil {
		s := t.IndicatorID.String()
		indicatorID = &s
	}
	return Response{
		ID:          t.ID.String(),
		OrgID:       t.OrganizationID.String(),
		MissionID:   t.MissionID.String(),
		IndicatorID: indicatorID,
		AssigneeID:  t.AssigneeID.String(),
		Title:       t.Title,
		Description: t.Description,
		Status:      string(t.Status),
		DueDate:     formatOptionalDate(t.DueDate),
		CompletedAt: formatOptionalTimestamp(t.CompletedAt),
		CreatedAt:   t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   t.UpdatedAt.Format(time.RFC3339),
	}
}

var formatOptionalDate = httputil.FormatOptionalDate
var formatOptionalTimestamp = httputil.FormatOptionalTimestamp
