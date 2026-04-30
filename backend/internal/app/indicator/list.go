package indicator

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
)

type ListCommand struct {
	OrganizationID domain.TenantID
	MissionID      *uuid.UUID
	OwnerID        *uuid.UUID
	Status         *string
	Page           int
	Size           int
}

type ListUseCase struct {
	indicators domainindicator.Repository
	logger     *slog.Logger
}

func NewListUseCase(indicators domainindicator.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{indicators: indicators, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (domainindicator.ListResult, error) {
	if cmd.Page <= 0 {
		cmd.Page = 1
	}
	if cmd.Size <= 0 {
		cmd.Size = 20
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}

	var status *domainindicator.Status
	if cmd.Status != nil {
		s := domainindicator.Status(*cmd.Status)
		status = &s
	}

	res, err := uc.indicators.List(ctx, domainindicator.ListFilter{
		OrganizationID: cmd.OrganizationID.UUID(),
		MissionID:      cmd.MissionID,
		OwnerID:        cmd.OwnerID,
		Status:         status,
		Page:           cmd.Page,
		Size:           cmd.Size,
	})
	if err != nil {
		return domainindicator.ListResult{}, err
	}
	res.Page = cmd.Page
	res.Size = cmd.Size
	return res, nil
}
