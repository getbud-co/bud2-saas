package cycle

import (
	"context"
	"log/slog"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
)

type ListCommand struct {
	OrganizationID domain.TenantID
	Status         *string
	Page           int
	Size           int
}

type ListUseCase struct {
	cycles domaincycle.Repository
	logger *slog.Logger
}

func NewListUseCase(cycles domaincycle.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{cycles: cycles, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (domaincycle.ListResult, error) {
	if cmd.Page <= 0 {
		cmd.Page = 1
	}
	if cmd.Size <= 0 {
		cmd.Size = 20
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}

	var status *domaincycle.Status
	if cmd.Status != nil {
		s := domaincycle.Status(*cmd.Status)
		status = &s
	}

	return uc.cycles.List(ctx, cmd.OrganizationID.UUID(), status, cmd.Page, cmd.Size)
}
