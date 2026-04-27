package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type indicatorQuerier interface {
	CreateIndicator(ctx context.Context, arg sqlc.CreateIndicatorParams) (sqlc.CreateIndicatorRow, error)
	GetIndicatorByID(ctx context.Context, arg sqlc.GetIndicatorByIDParams) (sqlc.GetIndicatorByIDRow, error)
	ListIndicators(ctx context.Context, arg sqlc.ListIndicatorsParams) ([]sqlc.ListIndicatorsRow, error)
	CountIndicators(ctx context.Context, arg sqlc.CountIndicatorsParams) (int64, error)
	UpdateIndicator(ctx context.Context, arg sqlc.UpdateIndicatorParams) (sqlc.UpdateIndicatorRow, error)
	SoftDeleteIndicator(ctx context.Context, arg sqlc.SoftDeleteIndicatorParams) (int64, error)
}

type IndicatorRepository struct {
	q indicatorQuerier
}

func NewIndicatorRepository(q indicatorQuerier) *IndicatorRepository {
	return &IndicatorRepository{q: q}
}

func (r *IndicatorRepository) Create(ctx context.Context, i *indicator.Indicator) (*indicator.Indicator, error) {
	row, err := r.q.CreateIndicator(ctx, sqlc.CreateIndicatorParams{
		ID:             i.ID,
		OrganizationID: i.OrganizationID,
		MissionID:      i.MissionID,
		OwnerID:        i.OwnerID,
		Title:          i.Title,
		Description:    textToPgtype(i.Description),
		TargetValue:    float64PtrToPgtypeNumeric(i.TargetValue),
		CurrentValue:   float64PtrToPgtypeNumeric(i.CurrentValue),
		Unit:           textToPgtype(i.Unit),
		Status:         string(i.Status),
		DueDate:        timeToPgtypeDate(i.DueDate),
	})
	if err != nil {
		if isFKViolation(err) {
			return nil, indicator.ErrInvalidReference
		}
		return nil, err
	}
	return indicatorRowToDomain(indicatorRowData(row)), nil
}

func (r *IndicatorRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*indicator.Indicator, error) {
	row, err := r.q.GetIndicatorByID(ctx, sqlc.GetIndicatorByIDParams{ID: id, OrganizationID: organizationID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, indicator.ErrNotFound
		}
		return nil, err
	}
	return indicatorRowToDomain(indicatorRowData(row)), nil
}

func (r *IndicatorRepository) List(ctx context.Context, f indicator.ListFilter) (indicator.ListResult, error) {
	page := f.Page
	size := f.Size
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	limit := int32(size)
	offset := int32((page - 1) * size)

	statusParam := pgtype.Text{Valid: false}
	if f.Status != nil {
		statusParam = pgtype.Text{String: string(*f.Status), Valid: true}
	}

	listParams := sqlc.ListIndicatorsParams{
		OrganizationID: f.OrganizationID,
		Limit:          limit,
		Offset:         offset,
		MissionID:      uuidPtrToPgtype(f.MissionID),
		OwnerID:        uuidPtrToPgtype(f.OwnerID),
		Status:         statusParam,
	}

	rows, err := r.q.ListIndicators(ctx, listParams)
	if err != nil {
		return indicator.ListResult{}, err
	}
	total, err := r.q.CountIndicators(ctx, sqlc.CountIndicatorsParams{
		OrganizationID: f.OrganizationID,
		MissionID:      listParams.MissionID,
		OwnerID:        listParams.OwnerID,
		Status:         listParams.Status,
	})
	if err != nil {
		return indicator.ListResult{}, err
	}

	indicators := make([]indicator.Indicator, 0, len(rows))
	for _, row := range rows {
		indicators = append(indicators, *indicatorRowToDomain(indicatorRowData(row)))
	}
	return indicator.ListResult{Indicators: indicators, Total: total}, nil
}

func (r *IndicatorRepository) Update(ctx context.Context, i *indicator.Indicator) (*indicator.Indicator, error) {
	row, err := r.q.UpdateIndicator(ctx, sqlc.UpdateIndicatorParams{
		ID:             i.ID,
		OrganizationID: i.OrganizationID,
		Title:          i.Title,
		Description:    textToPgtype(i.Description),
		OwnerID:        i.OwnerID,
		TargetValue:    float64PtrToPgtypeNumeric(i.TargetValue),
		CurrentValue:   float64PtrToPgtypeNumeric(i.CurrentValue),
		Unit:           textToPgtype(i.Unit),
		Status:         string(i.Status),
		DueDate:        timeToPgtypeDate(i.DueDate),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, indicator.ErrNotFound
		}
		if isFKViolation(err) {
			return nil, indicator.ErrInvalidReference
		}
		return nil, err
	}
	return indicatorRowToDomain(indicatorRowData(row)), nil
}

func (r *IndicatorRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	_, err := r.q.SoftDeleteIndicator(ctx, sqlc.SoftDeleteIndicatorParams{ID: id, OrganizationID: organizationID})
	return err
}

// ── helpers ────────────────────────────────────────────────────────────────

type indicatorRowData struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	MissionID      uuid.UUID
	OwnerID        uuid.UUID
	Title          string
	Description    pgtype.Text
	TargetValue    pgtype.Numeric
	CurrentValue   pgtype.Numeric
	Unit           pgtype.Text
	Status         string
	DueDate        pgtype.Date
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func indicatorRowToDomain(row indicatorRowData) *indicator.Indicator {
	return &indicator.Indicator{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		MissionID:      row.MissionID,
		OwnerID:        row.OwnerID,
		Title:          row.Title,
		Description:    pgtypeToText(row.Description),
		TargetValue:    pgtypeNumericToFloat64Ptr(row.TargetValue),
		CurrentValue:   pgtypeNumericToFloat64Ptr(row.CurrentValue),
		Unit:           pgtypeToText(row.Unit),
		Status:         indicator.Status(row.Status),
		DueDate:        pgtypeDateToTime(row.DueDate),
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}
