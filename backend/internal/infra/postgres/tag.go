package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/getbud-co/bud2/backend/internal/domain/tag"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type tagQuerier interface {
	CreateTag(ctx context.Context, arg sqlc.CreateTagParams) (sqlc.CreateTagRow, error)
	GetTagByID(ctx context.Context, arg sqlc.GetTagByIDParams) (sqlc.GetTagByIDRow, error)
	GetTagByName(ctx context.Context, arg sqlc.GetTagByNameParams) (sqlc.GetTagByNameRow, error)
	ListTags(ctx context.Context, arg sqlc.ListTagsParams) ([]sqlc.ListTagsRow, error)
	CountTags(ctx context.Context, organizationID uuid.UUID) (int64, error)
	UpdateTag(ctx context.Context, arg sqlc.UpdateTagParams) (sqlc.UpdateTagRow, error)
	SoftDeleteTag(ctx context.Context, arg sqlc.SoftDeleteTagParams) error
}

// tagListRowData is a superset of tagRowData that includes usage_count from
// the ListTags query (which performs a JOIN to count active mission references).
type tagListRowData struct {
	tagRowData
	UsageCount int64
}

type TagRepository struct {
	q tagQuerier
}

func NewTagRepository(q tagQuerier) *TagRepository {
	return &TagRepository{q: q}
}

func (r *TagRepository) Create(ctx context.Context, t *tag.Tag) (*tag.Tag, error) {
	row, err := r.q.CreateTag(ctx, sqlc.CreateTagParams{
		ID:             t.ID,
		OrganizationID: t.OrganizationID,
		Name:           t.Name,
		Color:          string(t.Color),
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, tag.ErrNameExists
		}
		return nil, err
	}
	t = createTagRowToDomain(row)
	if err := t.Validate(); err != nil {
		return nil, err
	}
	return t, nil
}

func (r *TagRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*tag.Tag, error) {
	row, err := r.q.GetTagByID(ctx, sqlc.GetTagByIDParams{ID: id, OrganizationID: organizationID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, tag.ErrNotFound
		}
		return nil, err
	}
	td := getTagByIDRowToDomain(row)
	if err := td.Validate(); err != nil {
		return nil, err
	}
	return td, nil
}

func (r *TagRepository) GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*tag.Tag, error) {
	row, err := r.q.GetTagByName(ctx, sqlc.GetTagByNameParams{OrganizationID: organizationID, Lower: name})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, tag.ErrNotFound
		}
		return nil, err
	}
	td := getTagByNameRowToDomain(row)
	if err := td.Validate(); err != nil {
		return nil, err
	}
	return td, nil
}

func (r *TagRepository) List(ctx context.Context, organizationID uuid.UUID, page, size int) (tag.ListResult, error) {
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	limit := int32(size)
	offset := int32((page - 1) * size)

	rows, err := r.q.ListTags(ctx, sqlc.ListTagsParams{
		OrganizationID: organizationID,
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		return tag.ListResult{}, err
	}
	total, err := r.q.CountTags(ctx, organizationID)
	if err != nil {
		return tag.ListResult{}, err
	}

	tags := make([]tag.Tag, 0, len(rows))
	for _, row := range rows {
		td := listTagsRowToDomain(row)
		if err := td.Validate(); err != nil {
			return tag.ListResult{}, err
		}
		tags = append(tags, *td)
	}
	return tag.ListResult{Tags: tags, Total: total}, nil
}

func (r *TagRepository) Update(ctx context.Context, t *tag.Tag) (*tag.Tag, error) {
	row, err := r.q.UpdateTag(ctx, sqlc.UpdateTagParams{
		ID:             t.ID,
		OrganizationID: t.OrganizationID,
		Name:           t.Name,
		Color:          string(t.Color),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, tag.ErrNotFound
		}
		if isUniqueViolation(err) {
			return nil, tag.ErrNameExists
		}
		return nil, err
	}
	t = updateTagRowToDomain(row)
	if err := t.Validate(); err != nil {
		return nil, err
	}
	return t, nil
}

func (r *TagRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	return r.q.SoftDeleteTag(ctx, sqlc.SoftDeleteTagParams{ID: id, OrganizationID: organizationID})
}

type tagRowData struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	Name           string
	Color          string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func tagRowToDomain(row tagRowData) *tag.Tag {
	return &tag.Tag{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		Name:           row.Name,
		Color:          tag.Color(row.Color),
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func tagListRowToDomainWithCount(row tagListRowData) *tag.Tag {
	t := tagRowToDomain(row.tagRowData)
	t.UsageCount = row.UsageCount
	return t
}

func createTagRowToDomain(row sqlc.CreateTagRow) *tag.Tag {
	return tagRowToDomain(tagRowData(row))
}

func getTagByIDRowToDomain(row sqlc.GetTagByIDRow) *tag.Tag {
	return tagRowToDomain(tagRowData(row))
}

func getTagByNameRowToDomain(row sqlc.GetTagByNameRow) *tag.Tag {
	return tagRowToDomain(tagRowData(row))
}

func listTagsRowToDomain(row sqlc.ListTagsRow) *tag.Tag {
	return tagListRowToDomainWithCount(tagListRowData{
		tagRowData: tagRowData{
			ID:             row.ID,
			OrganizationID: row.OrganizationID,
			Name:           row.Name,
			Color:          row.Color,
			CreatedAt:      row.CreatedAt,
			UpdatedAt:      row.UpdatedAt,
		},
		UsageCount: row.UsageCount,
	})
}

func updateTagRowToDomain(row sqlc.UpdateTagRow) *tag.Tag {
	return tagRowToDomain(tagRowData(row))
}
