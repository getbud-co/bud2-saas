package user

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type UpdateCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
	FirstName      string
	LastName       string
	Email          string
	Status         string
	Nickname       *string
	JobTitle       *string
	BirthDate      *time.Time
	Language       string
	Gender         *string
	Phone          *string
}

type UpdateUseCase struct {
	users  usr.Repository
	txm    apptx.Manager
	logger *slog.Logger
}

func NewUpdateUseCase(users usr.Repository, txm apptx.Manager, logger *slog.Logger) *UpdateUseCase {
	return &UpdateUseCase{users: users, txm: txm, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*usr.User, error) {
	var updatedUser *usr.User
	err := uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		u, txErr := repos.Users().GetByIDForOrganization(ctx, cmd.ID, cmd.OrganizationID.UUID())
		if txErr != nil {
			return txErr
		}

		if u.Email != cmd.Email {
			other, lookupErr := repos.Users().GetByEmail(ctx, cmd.Email)
			if lookupErr == nil && other.ID != cmd.ID {
				return usr.ErrEmailExists
			}
			if lookupErr != nil && !errors.Is(lookupErr, usr.ErrNotFound) {
				return lookupErr
			}
		}

		u.FirstName = cmd.FirstName
		u.LastName = cmd.LastName
		u.Email = cmd.Email
		u.Status = usr.Status(cmd.Status)
		u.Nickname = cmd.Nickname
		u.JobTitle = cmd.JobTitle
		u.BirthDate = cmd.BirthDate
		if cmd.Language != "" {
			u.Language = cmd.Language
		}
		u.Gender = cmd.Gender
		u.Phone = cmd.Phone

		if txErr = u.Validate(); txErr != nil {
			return txErr
		}

		updatedUser, txErr = repos.Users().Update(ctx, u)
		return txErr
	})
	if err != nil {
		return nil, err
	}
	return updatedUser, nil
}
