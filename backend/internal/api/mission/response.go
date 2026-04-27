package mission

import (
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appmission "github.com/getbud-co/bud2/backend/internal/app/mission"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

type Response struct {
	ID           string              `json:"id"`
	OrgID        string              `json:"org_id"`
	ParentID     *string             `json:"parent_id"`
	OwnerID      string              `json:"owner_id"`
	TeamID       *string             `json:"team_id"`
	Title        string              `json:"title"`
	Description  *string             `json:"description"`
	Status       string              `json:"status"`
	Visibility   string              `json:"visibility"`
	KanbanStatus string              `json:"kanban_status"`
	StartDate    string              `json:"start_date"`
	EndDate      string              `json:"end_date"`
	CompletedAt  *string             `json:"completed_at"`
	CreatedAt    string              `json:"created_at"`
	UpdatedAt    string              `json:"updated_at"`
	Indicators   []indicatorResponse `json:"indicators,omitempty"`
	Tasks        []taskResponse      `json:"tasks,omitempty"`
}

// indicatorResponse and taskResponse are inline projections used by the
// nested-create response on POST /missions. They mirror the standalone
// /indicators and /tasks payloads, but live inline so this package does not
// import the api/{indicator,task} packages (which would create a cycle since
// those packages already depend on app/* and domain/*).
type indicatorResponse struct {
	ID           string   `json:"id"`
	OrgID        string   `json:"org_id"`
	MissionID    string   `json:"mission_id"`
	OwnerID      string   `json:"owner_id"`
	Title        string   `json:"title"`
	Description  *string  `json:"description"`
	TargetValue  *float64 `json:"target_value"`
	CurrentValue *float64 `json:"current_value"`
	Unit         *string  `json:"unit"`
	Status       string   `json:"status"`
	DueDate      *string  `json:"due_date"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
}

type taskResponse struct {
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

func toResponse(m *domainmission.Mission) Response {
	return Response{
		ID:           m.ID.String(),
		OrgID:        m.OrganizationID.String(),
		ParentID:     uuidPtrString(m.ParentID),
		OwnerID:      m.OwnerID.String(),
		TeamID:       uuidPtrString(m.TeamID),
		Title:        m.Title,
		Description:  m.Description,
		Status:       string(m.Status),
		Visibility:   string(m.Visibility),
		KanbanStatus: string(m.KanbanStatus),
		StartDate:    m.StartDate.Format(httputil.DateLayout),
		EndDate:      m.EndDate.Format(httputil.DateLayout),
		CompletedAt:  formatOptionalTimestamp(m.CompletedAt),
		CreatedAt:    m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    m.UpdatedAt.Format(time.RFC3339),
	}
}

func toCreateResponse(res *appmission.CreateResult) Response {
	resp := toResponse(res.Mission)
	if len(res.Indicators) > 0 {
		resp.Indicators = make([]indicatorResponse, len(res.Indicators))
		for i := range res.Indicators {
			resp.Indicators[i] = toIndicatorResponse(&res.Indicators[i])
		}
	}
	if len(res.Tasks) > 0 {
		resp.Tasks = make([]taskResponse, len(res.Tasks))
		for i := range res.Tasks {
			resp.Tasks[i] = toTaskResponse(&res.Tasks[i])
		}
	}
	return resp
}

func toIndicatorResponse(ind *domainindicator.Indicator) indicatorResponse {
	return indicatorResponse{
		ID:           ind.ID.String(),
		OrgID:        ind.OrganizationID.String(),
		MissionID:    ind.MissionID.String(),
		OwnerID:      ind.OwnerID.String(),
		Title:        ind.Title,
		Description:  ind.Description,
		TargetValue:  ind.TargetValue,
		CurrentValue: ind.CurrentValue,
		Unit:         ind.Unit,
		Status:       string(ind.Status),
		DueDate:      formatOptionalDate(ind.DueDate),
		CreatedAt:    ind.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    ind.UpdatedAt.Format(time.RFC3339),
	}
}

func toTaskResponse(t *domaintask.Task) taskResponse {
	var indicatorID *string
	if t.IndicatorID != nil {
		s := t.IndicatorID.String()
		indicatorID = &s
	}
	return taskResponse{
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

func uuidPtrString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}

var formatOptionalDate = httputil.FormatOptionalDate
var formatOptionalTimestamp = httputil.FormatOptionalTimestamp
