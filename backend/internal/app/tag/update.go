package tag

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

type UpdateCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
	Name           string
	Color          string
}

type UpdateUseCase struct {
	tags   domaintag.Repository
	logger *slog.Logger
}

func NewUpdateUseCase(tags domaintag.Repository, logger *slog.Logger) *UpdateUseCase {
	return &UpdateUseCase{tags: tags, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domaintag.Tag, error) {
	uc.logger.DebugContext(ctx, "update tag", "tag_id", cmd.ID, "org_id", cmd.OrganizationID)

	existing, err := uc.tags.GetByID(ctx, cmd.ID, cmd.OrganizationID.UUID())
	if err != nil {
		return nil, err
	}
	if existing.Name != cmd.Name {
		if _, nameErr := uc.tags.GetByName(ctx, cmd.OrganizationID.UUID(), cmd.Name); nameErr == nil {
			return nil, domaintag.ErrNameExists
		} else if !errors.Is(nameErr, domaintag.ErrNotFound) {
			return nil, nameErr
		}
	}

	existing.Name = cmd.Name
	existing.Color = domaintag.Color(cmd.Color)
	if err := existing.Validate(); err != nil {
		return nil, err
	}

	updated, err := uc.tags.Update(ctx, existing)
	if err != nil {
		uc.logger.WarnContext(ctx, "update tag failed", "tag_id", cmd.ID, "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "tag updated", "tag_id", updated.ID)
	return updated, nil
}
