package organization

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type UpdateCommand struct {
	ID        uuid.UUID
	Name      string
	Domain    string
	Workspace string
	Status    string
}

type UpdateUseCase struct {
	repo   org.Repository
	logger *slog.Logger
}

func NewUpdateUseCase(repo org.Repository, logger *slog.Logger) *UpdateUseCase {
	return &UpdateUseCase{repo: repo, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*org.Organization, error) {
	uc.logger.Debug("updating organization", "organization_id", cmd.ID)

	existing, err := uc.repo.GetByID(ctx, cmd.ID)
	if err != nil {
		uc.logger.Error("failed to fetch organization for update", "error", err, "organization_id", cmd.ID)
		return nil, err
	}

	originalDomain := existing.Domain
	originalWorkspace := existing.Workspace

	existing.Name = cmd.Name
	existing.Domain = cmd.Domain
	existing.Workspace = cmd.Workspace
	existing.Status = org.Status(cmd.Status)

	if err := existing.Validate(); err != nil {
		uc.logger.Warn("organization validation failed", "error", err, "organization_id", cmd.ID)
		return nil, err
	}

	if originalDomain != cmd.Domain {
		other, err := uc.repo.GetByDomain(ctx, cmd.Domain)
		if err == nil && other.ID != cmd.ID {
			uc.logger.Warn("domain conflict", "domain", cmd.Domain, "organization_id", cmd.ID)
			return nil, org.ErrDomainExists
		}
		if err != nil && !errors.Is(err, org.ErrNotFound) {
			uc.logger.Error("failed to check domain uniqueness", "error", err, "domain", cmd.Domain)
			return nil, err
		}
	}

	if originalWorkspace != cmd.Workspace {
		other, err := uc.repo.GetByWorkspace(ctx, cmd.Workspace)
		if err == nil && other.ID != cmd.ID {
			uc.logger.Warn("workspace conflict", "workspace", cmd.Workspace, "organization_id", cmd.ID)
			return nil, org.ErrWorkspaceExists
		}
		if err != nil && !errors.Is(err, org.ErrNotFound) {
			uc.logger.Error("failed to check workspace uniqueness", "error", err, "workspace", cmd.Workspace)
			return nil, err
		}
	}

	result, err := uc.repo.Update(ctx, existing)
	if err != nil {
		uc.logger.Error("failed to update organization", "error", err, "organization_id", cmd.ID)
		return nil, err
	}

	uc.logger.Info("organization updated", "organization_id", result.ID, "domain", result.Domain, "workspace", result.Workspace)
	return result, nil
}
