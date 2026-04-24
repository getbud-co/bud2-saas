package permission

import (
	"context"
	"log/slog"

	permdom "github.com/getbud-co/bud2/backend/internal/domain/permission"
)

type ListUseCase struct {
	logger *slog.Logger
}

func NewListUseCase(logger *slog.Logger) *ListUseCase {
	return &ListUseCase{logger: logger}
}

func (uc *ListUseCase) Execute(_ context.Context) ([]permdom.Permission, error) {
	permissions := permdom.Catalog()
	uc.logger.Debug("permissions catalog returned", "count", len(permissions))
	return permissions, nil
}
