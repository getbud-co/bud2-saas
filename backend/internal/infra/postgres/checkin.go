package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type checkInQuerier interface {
	CreateCheckIn(ctx context.Context, arg sqlc.CreateCheckInParams) (sqlc.CreateCheckInRow, error)
	GetCheckInByID(ctx context.Context, arg sqlc.GetCheckInByIDParams) (sqlc.GetCheckInByIDRow, error)
	ListCheckInsByIndicator(ctx context.Context, arg sqlc.ListCheckInsByIndicatorParams) ([]sqlc.ListCheckInsByIndicatorRow, error)
	CountCheckInsByIndicator(ctx context.Context, arg sqlc.CountCheckInsByIndicatorParams) (int64, error)
	UpdateCheckIn(ctx context.Context, arg sqlc.UpdateCheckInParams) (sqlc.UpdateCheckInRow, error)
	SoftDeleteCheckIn(ctx context.Context, arg sqlc.SoftDeleteCheckInParams) error
}

type CheckInRepository struct {
	q checkInQuerier
}

func NewCheckInRepository(q checkInQuerier) *CheckInRepository {
	return &CheckInRepository{q: q}
}

func (r *CheckInRepository) Create(ctx context.Context, c *domaincheckin.CheckIn) (*domaincheckin.CheckIn, error) {
	row, err := r.q.CreateCheckIn(ctx, sqlc.CreateCheckInParams{
		ID:            c.ID,
		OrgID:         c.OrgID,
		IndicatorID:   c.IndicatorID,
		AuthorID:      c.AuthorID,
		Value:         c.Value,
		PreviousValue: strToPgtypeText(c.PreviousValue),
		Confidence:    string(c.Confidence),
		Note:          strToPgtypeText(c.Note),
		Mentions:      c.Mentions,
	})
	if err != nil {
		return nil, err
	}
	return checkInCreateRowToDomain(row), nil
}

func (r *CheckInRepository) GetByID(ctx context.Context, id, orgID uuid.UUID) (*domaincheckin.CheckIn, error) {
	row, err := r.q.GetCheckInByID(ctx, sqlc.GetCheckInByIDParams{ID: id, OrgID: orgID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domaincheckin.ErrNotFound
		}
		return nil, err
	}
	return checkInGetRowToDomain(row), nil
}

func (r *CheckInRepository) ListByIndicator(ctx context.Context, orgID, indicatorID uuid.UUID, page, size int) (domaincheckin.ListResult, error) {
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 50
	}
	limit := int32(size)
	offset := int32((page - 1) * size)

	rows, err := r.q.ListCheckInsByIndicator(ctx, sqlc.ListCheckInsByIndicatorParams{
		OrgID:       orgID,
		IndicatorID: indicatorID,
		Limit:       limit,
		Offset:      offset,
	})
	if err != nil {
		return domaincheckin.ListResult{}, err
	}

	total, err := r.q.CountCheckInsByIndicator(ctx, sqlc.CountCheckInsByIndicatorParams{
		OrgID:       orgID,
		IndicatorID: indicatorID,
	})
	if err != nil {
		return domaincheckin.ListResult{}, err
	}

	items := make([]domaincheckin.CheckIn, 0, len(rows))
	for _, row := range rows {
		items = append(items, checkInListRowToDomain(row))
	}
	return domaincheckin.ListResult{CheckIns: items, Total: total, Page: page, Size: size}, nil
}

func (r *CheckInRepository) Update(ctx context.Context, c *domaincheckin.CheckIn) (*domaincheckin.CheckIn, error) {
	row, err := r.q.UpdateCheckIn(ctx, sqlc.UpdateCheckInParams{
		ID:         c.ID,
		OrgID:      c.OrgID,
		Value:      c.Value,
		Confidence: string(c.Confidence),
		Note:       strToPgtypeText(c.Note),
		Mentions:   c.Mentions,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domaincheckin.ErrNotFound
		}
		return nil, err
	}
	return checkInUpdateRowToDomain(row), nil
}

func (r *CheckInRepository) SoftDelete(ctx context.Context, id, orgID uuid.UUID) error {
	return r.q.SoftDeleteCheckIn(ctx, sqlc.SoftDeleteCheckInParams{ID: id, OrgID: orgID})
}

func strToPgtypeText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

type checkInBaseRow struct {
	ID            uuid.UUID
	OrgID         uuid.UUID
	IndicatorID   uuid.UUID
	AuthorID      uuid.UUID
	Value         string
	PreviousValue pgtype.Text
	Confidence    string
	Note          pgtype.Text
	Mentions      []string
	AuthorName    *domaincheckin.AuthorName
}

func toDomainCheckIn(r checkInBaseRow) *domaincheckin.CheckIn {
	return &domaincheckin.CheckIn{
		ID:            r.ID,
		OrgID:         r.OrgID,
		IndicatorID:   r.IndicatorID,
		AuthorID:      r.AuthorID,
		Value:         r.Value,
		PreviousValue: pgtypeTextToStr(r.PreviousValue),
		Confidence:    domaincheckin.Confidence(r.Confidence),
		Note:          pgtypeTextToStr(r.Note),
		Mentions:      r.Mentions,
		AuthorName:    r.AuthorName,
	}
}

func pgtypeTextToStr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	s := t.String
	return &s
}

func checkInCreateRowToDomain(row sqlc.CreateCheckInRow) *domaincheckin.CheckIn {
	return toDomainCheckIn(checkInBaseRow{
		ID:            row.ID,
		OrgID:         row.OrgID,
		IndicatorID:   row.IndicatorID,
		AuthorID:      row.AuthorID,
		Value:         row.Value,
		PreviousValue: row.PreviousValue,
		Confidence:    row.Confidence,
		Note:          row.Note,
		Mentions:      row.Mentions,
	})
}

func checkInGetRowToDomain(row sqlc.GetCheckInByIDRow) *domaincheckin.CheckIn {
	return toDomainCheckIn(checkInBaseRow{
		ID:            row.ID,
		OrgID:         row.OrgID,
		IndicatorID:   row.IndicatorID,
		AuthorID:      row.AuthorID,
		Value:         row.Value,
		PreviousValue: row.PreviousValue,
		Confidence:    row.Confidence,
		Note:          row.Note,
		Mentions:      row.Mentions,
	})
}

func checkInListRowToDomain(row sqlc.ListCheckInsByIndicatorRow) domaincheckin.CheckIn {
	c := toDomainCheckIn(checkInBaseRow{
		ID:            row.ID,
		OrgID:         row.OrgID,
		IndicatorID:   row.IndicatorID,
		AuthorID:      row.AuthorID,
		Value:         row.Value,
		PreviousValue: row.PreviousValue,
		Confidence:    row.Confidence,
		Note:          row.Note,
		Mentions:      row.Mentions,
		AuthorName: &domaincheckin.AuthorName{
			FirstName: row.AuthorFirstName,
			LastName:  row.AuthorLastName,
		},
	})
	c.CreatedAt = row.CreatedAt
	c.UpdatedAt = row.UpdatedAt
	return *c
}

func checkInUpdateRowToDomain(row sqlc.UpdateCheckInRow) *domaincheckin.CheckIn {
	return toDomainCheckIn(checkInBaseRow{
		ID:            row.ID,
		OrgID:         row.OrgID,
		IndicatorID:   row.IndicatorID,
		AuthorID:      row.AuthorID,
		Value:         row.Value,
		PreviousValue: row.PreviousValue,
		Confidence:    row.Confidence,
		Note:          row.Note,
		Mentions:      row.Mentions,
	})
}
