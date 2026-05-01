package tag

import (
	"context"
	"errors"
	"log/slog"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

type CreateCommand struct {
	OrganizationID domain.TenantID
	Name           string
	Color          string
}

type CreateUseCase struct {
	tags   domaintag.Repository
	logger *slog.Logger
}

func NewCreateUseCase(tags domaintag.Repository, logger *slog.Logger) *CreateUseCase {
	return &CreateUseCase{tags: tags, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*domaintag.Tag, error) {
	uc.logger.DebugContext(ctx, "create tag", "org_id", cmd.OrganizationID, "name", cmd.Name)

	if _, err := uc.tags.GetByName(ctx, cmd.OrganizationID.UUID(), cmd.Name); err == nil {
		return nil, domaintag.ErrNameExists
	} else if !errors.Is(err, domaintag.ErrNotFound) {
		return nil, err
	}

	t, err := domaintag.NewTag(cmd.OrganizationID.UUID(), cmd.Name, domaintag.Color(cmd.Color))
	if err != nil {
		return nil, err
	}

	created, err := uc.tags.Create(ctx, t)
	if err != nil {
		uc.logger.WarnContext(ctx, "create tag failed", "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "tag created", "tag_id", created.ID)
	return created, nil
}
