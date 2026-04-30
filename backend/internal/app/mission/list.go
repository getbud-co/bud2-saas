package mission

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

type ListCommand struct {
	OrganizationID domain.TenantID
	OwnerID        *uuid.UUID
	TeamID         *uuid.UUID
	Status         *string
	ParentID       *uuid.UUID
	FilterByParent bool
	Page           int
	Size           int
}

type ListUseCase struct {
	missions domainmission.Repository
	logger   *slog.Logger
}

func NewListUseCase(missions domainmission.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{missions: missions, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (domainmission.ListResult, error) {
	if cmd.Page <= 0 {
		cmd.Page = 1
	}
	if cmd.Size <= 0 {
		cmd.Size = 20
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}

	var status *domainmission.Status
	if cmd.Status != nil {
		s := domainmission.Status(*cmd.Status)
		status = &s
	}

	res, err := uc.missions.List(ctx, domainmission.ListFilter{
		OrganizationID: cmd.OrganizationID.UUID(),
		OwnerID:        cmd.OwnerID,
		TeamID:         cmd.TeamID,
		Status:         status,
		ParentID:       cmd.ParentID,
		FilterByParent: cmd.FilterByParent,
		Page:           cmd.Page,
		Size:           cmd.Size,
	})
	if err != nil {
		return domainmission.ListResult{}, err
	}
	// Echo the effective values so callers don't need to re-derive them.
	res.Page = cmd.Page
	res.Size = cmd.Size
	return res, nil
}
