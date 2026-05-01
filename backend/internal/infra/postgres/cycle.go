package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/getbud-co/bud2/backend/internal/domain/cycle"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type cycleQuerier interface {
	CreateCycle(ctx context.Context, arg sqlc.CreateCycleParams) (sqlc.CreateCycleRow, error)
	GetCycleByID(ctx context.Context, arg sqlc.GetCycleByIDParams) (sqlc.GetCycleByIDRow, error)
	GetCycleByName(ctx context.Context, arg sqlc.GetCycleByNameParams) (sqlc.GetCycleByNameRow, error)
	ListCycles(ctx context.Context, arg sqlc.ListCyclesParams) ([]sqlc.ListCyclesRow, error)
	ListCyclesByStatus(ctx context.Context, arg sqlc.ListCyclesByStatusParams) ([]sqlc.ListCyclesByStatusRow, error)
	CountCycles(ctx context.Context, organizationID uuid.UUID) (int64, error)
	CountCyclesByStatus(ctx context.Context, arg sqlc.CountCyclesByStatusParams) (int64, error)
	UpdateCycle(ctx context.Context, arg sqlc.UpdateCycleParams) (sqlc.UpdateCycleRow, error)
	SoftDeleteCycle(ctx context.Context, arg sqlc.SoftDeleteCycleParams) error
}

type CycleRepository struct {
	q cycleQuerier
}

func NewCycleRepository(q cycleQuerier) *CycleRepository {
	return &CycleRepository{q: q}
}

func (r *CycleRepository) Create(ctx context.Context, c *cycle.Cycle) (*cycle.Cycle, error) {
	row, err := r.q.CreateCycle(ctx, sqlc.CreateCycleParams{
		ID:                    c.ID,
		OrganizationID:        c.OrganizationID,
		Name:                  c.Name,
		Type:                  string(c.Type),
		StartDate:             timeToPgtypeDate(&c.StartDate),
		EndDate:               timeToPgtypeDate(&c.EndDate),
		Status:                string(c.Status),
		OkrDefinitionDeadline: timeToPgtypeDate(c.OKRDefinitionDeadline),
		MidReviewDate:         timeToPgtypeDate(c.MidReviewDate),
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, cycle.ErrNameExists
		}
		return nil, err
	}
	c = createCycleRowToDomain(row)
	if err := c.Validate(); err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CycleRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*cycle.Cycle, error) {
	row, err := r.q.GetCycleByID(ctx, sqlc.GetCycleByIDParams{ID: id, OrganizationID: organizationID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, cycle.ErrNotFound
		}
		return nil, err
	}
	c := getCycleByIDRowToDomain(row)
	if err := c.Validate(); err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CycleRepository) GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*cycle.Cycle, error) {
	row, err := r.q.GetCycleByName(ctx, sqlc.GetCycleByNameParams{OrganizationID: organizationID, Lower: name})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, cycle.ErrNotFound
		}
		return nil, err
	}
	c := getCycleByNameRowToDomain(row)
	if err := c.Validate(); err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CycleRepository) List(ctx context.Context, organizationID uuid.UUID, status *cycle.Status, page, size int) (cycle.ListResult, error) {
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	limit := int32(size)
	offset := int32((page - 1) * size)

	var cycles []cycle.Cycle
	var total int64
	var err error
	if status != nil {
		rows, listErr := r.q.ListCyclesByStatus(ctx, sqlc.ListCyclesByStatusParams{
			OrganizationID: organizationID,
			Status:         string(*status),
			Limit:          limit,
			Offset:         offset,
		})
		if listErr != nil {
			return cycle.ListResult{}, listErr
		}
		total, err = r.q.CountCyclesByStatus(ctx, sqlc.CountCyclesByStatusParams{OrganizationID: organizationID, Status: string(*status)})
		if err != nil {
			return cycle.ListResult{}, err
		}
		cycles = make([]cycle.Cycle, 0, len(rows))
		for _, row := range rows {
			c := listCyclesByStatusRowToDomain(row)
			if err := c.Validate(); err != nil {
				return cycle.ListResult{}, err
			}
			cycles = append(cycles, *c)
		}
	} else {
		rows, listErr := r.q.ListCycles(ctx, sqlc.ListCyclesParams{OrganizationID: organizationID, Limit: limit, Offset: offset})
		if listErr != nil {
			return cycle.ListResult{}, listErr
		}
		total, err = r.q.CountCycles(ctx, organizationID)
		if err != nil {
			return cycle.ListResult{}, err
		}
		cycles = make([]cycle.Cycle, 0, len(rows))
		for _, row := range rows {
			c := listCyclesRowToDomain(row)
			if err := c.Validate(); err != nil {
				return cycle.ListResult{}, err
			}
			cycles = append(cycles, *c)
		}
	}

	return cycle.ListResult{Cycles: cycles, Total: total}, nil
}

func (r *CycleRepository) Update(ctx context.Context, c *cycle.Cycle) (*cycle.Cycle, error) {
	row, err := r.q.UpdateCycle(ctx, sqlc.UpdateCycleParams{
		ID:                    c.ID,
		OrganizationID:        c.OrganizationID,
		Name:                  c.Name,
		Type:                  string(c.Type),
		StartDate:             timeToPgtypeDate(&c.StartDate),
		EndDate:               timeToPgtypeDate(&c.EndDate),
		Status:                string(c.Status),
		OkrDefinitionDeadline: timeToPgtypeDate(c.OKRDefinitionDeadline),
		MidReviewDate:         timeToPgtypeDate(c.MidReviewDate),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, cycle.ErrNotFound
		}
		if isUniqueViolation(err) {
			return nil, cycle.ErrNameExists
		}
		return nil, err
	}
	c = updateCycleRowToDomain(row)
	if err := c.Validate(); err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CycleRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	return r.q.SoftDeleteCycle(ctx, sqlc.SoftDeleteCycleParams{ID: id, OrganizationID: organizationID})
}

type cycleRowData struct {
	ID                    uuid.UUID
	OrganizationID        uuid.UUID
	Name                  string
	Type                  string
	StartDate             pgtype.Date
	EndDate               pgtype.Date
	Status                string
	OkrDefinitionDeadline pgtype.Date
	MidReviewDate         pgtype.Date
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

func cycleRowToDomain(row cycleRowData) *cycle.Cycle {
	return &cycle.Cycle{
		ID:                    row.ID,
		OrganizationID:        row.OrganizationID,
		Name:                  row.Name,
		Type:                  cycle.Type(row.Type),
		StartDate:             row.StartDate.Time,
		EndDate:               row.EndDate.Time,
		Status:                cycle.Status(row.Status),
		OKRDefinitionDeadline: pgtypeDateToTime(row.OkrDefinitionDeadline),
		MidReviewDate:         pgtypeDateToTime(row.MidReviewDate),
		CreatedAt:             row.CreatedAt,
		UpdatedAt:             row.UpdatedAt,
	}
}

func createCycleRowToDomain(row sqlc.CreateCycleRow) *cycle.Cycle {
	return cycleRowToDomain(cycleRowData(row))
}

func getCycleByIDRowToDomain(row sqlc.GetCycleByIDRow) *cycle.Cycle {
	return cycleRowToDomain(cycleRowData(row))
}

func getCycleByNameRowToDomain(row sqlc.GetCycleByNameRow) *cycle.Cycle {
	return cycleRowToDomain(cycleRowData(row))
}

func listCyclesRowToDomain(row sqlc.ListCyclesRow) *cycle.Cycle {
	return cycleRowToDomain(cycleRowData(row))
}

func listCyclesByStatusRowToDomain(row sqlc.ListCyclesByStatusRow) *cycle.Cycle {
	return cycleRowToDomain(cycleRowData(row))
}

func updateCycleRowToDomain(row sqlc.UpdateCycleRow) *cycle.Cycle {
	return cycleRowToDomain(cycleRowData(row))
}
