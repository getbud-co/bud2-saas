package organization

import (
	"context"
	"errors"
	"log/slog"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type CreateCommand struct {
	Name      string
	Domain    string
	Workspace string
	Status    string
}

type CreateUseCase struct {
	repo   org.Repository
	logger *slog.Logger
}

func NewCreateUseCase(repo org.Repository, logger *slog.Logger) *CreateUseCase {
	return &CreateUseCase{repo: repo, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*org.Organization, error) {
	uc.logger.Debug("creating organization", "name", cmd.Name, "domain", cmd.Domain, "workspace", cmd.Workspace)

	var opts []org.OrgOption
	if cmd.Status != "" {
		opts = append(opts, org.WithStatus(org.Status(cmd.Status)))
	}
	o, err := org.NewOrganization(cmd.Name, cmd.Domain, cmd.Workspace, opts...)
	if err != nil {
		uc.logger.Warn("organization validation failed", "error", err, "domain", cmd.Domain, "workspace", cmd.Workspace)
		return nil, err
	}

	_, err = uc.repo.GetByDomain(ctx, cmd.Domain)
	if err == nil {
		uc.logger.Warn("domain conflict", "domain", cmd.Domain)
		return nil, org.ErrDomainExists
	}
	if !errors.Is(err, org.ErrNotFound) {
		uc.logger.Error("failed to check domain uniqueness", "error", err, "domain", cmd.Domain)
		return nil, err
	}

	_, err = uc.repo.GetByWorkspace(ctx, cmd.Workspace)
	if err == nil {
		uc.logger.Warn("workspace conflict", "workspace", cmd.Workspace)
		return nil, org.ErrWorkspaceExists
	}
	if !errors.Is(err, org.ErrNotFound) {
		uc.logger.Error("failed to check workspace uniqueness", "error", err, "workspace", cmd.Workspace)
		return nil, err
	}

	result, err := uc.repo.Create(ctx, o)
	if err != nil {
		uc.logger.Error("failed to create organization", "error", err, "domain", cmd.Domain, "workspace", cmd.Workspace)
		return nil, err
	}

	uc.logger.Info("organization created", "organization_id", result.ID, "domain", result.Domain, "workspace", result.Workspace)
	return result, nil
}
