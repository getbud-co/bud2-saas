package mission

import (
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

func toMemberResponses(members []domainmission.Member) []MemberResponse {
	out := make([]MemberResponse, len(members))
	for i, m := range members {
		out[i] = MemberResponse{
			UserID:   m.UserID.String(),
			Role:     string(m.Role),
			JoinedAt: m.JoinedAt.Format(time.RFC3339),
		}
	}
	return out
}

type MemberResponse struct {
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	JoinedAt string `json:"joined_at"`
}

type Response struct {
	ID           string           `json:"id"`
	OrgID        string           `json:"org_id"`
	ParentID     *string          `json:"parent_id"`
	OwnerID      string           `json:"owner_id"`
	TeamID       *string          `json:"team_id"`
	Title        string           `json:"title"`
	Description  *string          `json:"description"`
	Status       string           `json:"status"`
	Visibility   string           `json:"visibility"`
	KanbanStatus string           `json:"kanban_status"`
	StartDate    string           `json:"start_date"`
	EndDate      string           `json:"end_date"`
	CompletedAt  *string          `json:"completed_at"`
	CreatedAt    string           `json:"created_at"`
	UpdatedAt    string           `json:"updated_at"`
	Members      []MemberResponse `json:"members,omitempty"`
	TagIDs       []string         `json:"tag_ids,omitempty"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(m *domainmission.Mission) Response {
	tagIDs := make([]string, len(m.TagIDs))
	for i, id := range m.TagIDs {
		tagIDs[i] = id.String()
	}
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
		Members:      toMemberResponses(m.Members),
		TagIDs:       tagIDs,
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
