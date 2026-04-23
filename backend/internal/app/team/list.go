package team

import (
	"context"
	"log/slog"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
)

type ListCommand struct {
	OrganizationID domain.TenantID
	Status         *string
	Page           int
	Size           int
}

type ListUseCase struct {
	teams  domainteam.Repository
	logger *slog.Logger
}

func NewListUseCase(teams domainteam.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{teams: teams, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (domainteam.ListResult, error) {
	if cmd.Page <= 0 {
		cmd.Page = 1
	}
	if cmd.Size <= 0 {
		cmd.Size = 20
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}

	var status *domainteam.Status
	if cmd.Status != nil {
		s := domainteam.Status(*cmd.Status)
		status = &s
	}

	return uc.teams.List(ctx, cmd.OrganizationID.UUID(), status, cmd.Page, cmd.Size)
}
