package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type orgQuerier interface {
	CreateOrganization(ctx context.Context, arg sqlc.CreateOrganizationParams) (sqlc.CreateOrganizationRow, error)
	GetOrganizationByID(ctx context.Context, id uuid.UUID) (sqlc.GetOrganizationByIDRow, error)
	GetOrganizationByIDForUser(ctx context.Context, arg sqlc.GetOrganizationByIDForUserParams) (sqlc.GetOrganizationByIDForUserRow, error)
	GetOrganizationByDomain(ctx context.Context, lower string) (sqlc.GetOrganizationByDomainRow, error)
	GetOrganizationByWorkspace(ctx context.Context, workspace string) (sqlc.GetOrganizationByWorkspaceRow, error)
	ListOrganizations(ctx context.Context, arg sqlc.ListOrganizationsParams) ([]sqlc.ListOrganizationsRow, error)
	ListOrganizationsByUser(ctx context.Context, arg sqlc.ListOrganizationsByUserParams) ([]sqlc.ListOrganizationsByUserRow, error)
	ListOrganizationsByStatus(ctx context.Context, arg sqlc.ListOrganizationsByStatusParams) ([]sqlc.ListOrganizationsByStatusRow, error)
	ListOrganizationsByUserAndStatus(ctx context.Context, arg sqlc.ListOrganizationsByUserAndStatusParams) ([]sqlc.ListOrganizationsByUserAndStatusRow, error)
	CountOrganizations(ctx context.Context) (int64, error)
	CountOrganizationsByUser(ctx context.Context, userID uuid.UUID) (int64, error)
	CountOrganizationsByStatus(ctx context.Context, status string) (int64, error)
	CountOrganizationsByUserAndStatus(ctx context.Context, arg sqlc.CountOrganizationsByUserAndStatusParams) (int64, error)
	SoftDeleteOrganization(ctx context.Context, id uuid.UUID) error
	SoftDeleteOrganizationMembershipsByOrganization(ctx context.Context, organizationID uuid.UUID) error
	UpdateOrganization(ctx context.Context, arg sqlc.UpdateOrganizationParams) (sqlc.UpdateOrganizationRow, error)
}

type OrgRepository struct {
	q orgQuerier
}

func NewOrgRepository(q orgQuerier) *OrgRepository {
	return &OrgRepository{q: q}
}

func (r *OrgRepository) Create(ctx context.Context, org *organization.Organization) (*organization.Organization, error) {
	row, err := r.q.CreateOrganization(ctx, sqlc.CreateOrganizationParams{
		Name:      org.Name,
		Domain:    org.Domain,
		Workspace: org.Workspace,
		Status:    string(org.Status),
	})
	if err != nil {
		return nil, err
	}
	return createOrganizationRowToDomain(row), nil
}

func (r *OrgRepository) GetByID(ctx context.Context, id uuid.UUID) (*organization.Organization, error) {
	row, err := r.q.GetOrganizationByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, organization.ErrNotFound
		}
		return nil, err
	}
	return getOrganizationByIDRowToDomain(row), nil
}

func (r *OrgRepository) GetByIDForUser(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*organization.Organization, error) {
	row, err := r.q.GetOrganizationByIDForUser(ctx, sqlc.GetOrganizationByIDForUserParams{UserID: userID, ID: id})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, organization.ErrNotFound
		}
		return nil, err
	}
	return getOrganizationByIDForUserRowToDomain(row), nil
}

func (r *OrgRepository) GetByDomain(ctx context.Context, domain string) (*organization.Organization, error) {
	row, err := r.q.GetOrganizationByDomain(ctx, domain)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, organization.ErrNotFound
		}
		return nil, err
	}
	return getOrganizationByDomainRowToDomain(row), nil
}

func (r *OrgRepository) GetByWorkspace(ctx context.Context, workspace string) (*organization.Organization, error) {
	row, err := r.q.GetOrganizationByWorkspace(ctx, workspace)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, organization.ErrNotFound
		}
		return nil, err
	}
	return getOrganizationByWorkspaceRowToDomain(row), nil
}

func (r *OrgRepository) List(ctx context.Context, filter organization.ListFilter) (organization.ListResult, error) {
	limit := int32(filter.Size)
	offset := int32((filter.Page - 1) * filter.Size)

	var orgs []organization.Organization
	var total int64
	var err error

	if filter.Status != nil {
		status := string(*filter.Status)
		rows, listErr := r.q.ListOrganizationsByStatus(ctx, sqlc.ListOrganizationsByStatusParams{
			Status: status,
			Limit:  limit,
			Offset: offset,
		})
		if listErr != nil {
			return organization.ListResult{}, listErr
		}
		orgs = make([]organization.Organization, len(rows))
		for i, row := range rows {
			orgs[i] = *listOrganizationsByStatusRowToDomain(row)
		}
		total, err = r.q.CountOrganizationsByStatus(ctx, status)
	} else {
		rows, listErr := r.q.ListOrganizations(ctx, sqlc.ListOrganizationsParams{
			Limit:  limit,
			Offset: offset,
		})
		if listErr != nil {
			return organization.ListResult{}, listErr
		}
		orgs = make([]organization.Organization, len(rows))
		for i, row := range rows {
			orgs[i] = *listOrganizationsRowToDomain(row)
		}
		total, err = r.q.CountOrganizations(ctx)
	}

	if err != nil {
		return organization.ListResult{}, err
	}

	return organization.ListResult{
		Organizations: orgs,
		Total:         total,
	}, nil
}

func (r *OrgRepository) ListByUser(ctx context.Context, userID uuid.UUID, filter organization.ListFilter) (organization.ListResult, error) {
	limit := int32(filter.Size)
	offset := int32((filter.Page - 1) * filter.Size)

	var orgs []organization.Organization
	var total int64
	var err error

	if filter.Status != nil {
		status := string(*filter.Status)
		rows, listErr := r.q.ListOrganizationsByUserAndStatus(ctx, sqlc.ListOrganizationsByUserAndStatusParams{
			UserID: userID,
			Status: status,
			Limit:  limit,
			Offset: offset,
		})
		if listErr != nil {
			return organization.ListResult{}, listErr
		}
		orgs = make([]organization.Organization, len(rows))
		for i, row := range rows {
			orgs[i] = *listOrganizationsByUserAndStatusRowToDomain(row)
		}
		total, err = r.q.CountOrganizationsByUserAndStatus(ctx, sqlc.CountOrganizationsByUserAndStatusParams{
			UserID: userID,
			Status: status,
		})
	} else {
		rows, listErr := r.q.ListOrganizationsByUser(ctx, sqlc.ListOrganizationsByUserParams{
			UserID: userID,
			Limit:  limit,
			Offset: offset,
		})
		if listErr != nil {
			return organization.ListResult{}, listErr
		}
		orgs = make([]organization.Organization, len(rows))
		for i, row := range rows {
			orgs[i] = *listOrganizationsByUserRowToDomain(row)
		}
		total, err = r.q.CountOrganizationsByUser(ctx, userID)
	}

	if err != nil {
		return organization.ListResult{}, err
	}

	return organization.ListResult{Organizations: orgs, Total: total}, nil
}

func (r *OrgRepository) Update(ctx context.Context, org *organization.Organization) (*organization.Organization, error) {
	row, err := r.q.UpdateOrganization(ctx, sqlc.UpdateOrganizationParams{
		ID:        org.ID,
		Name:      org.Name,
		Domain:    org.Domain,
		Workspace: org.Workspace,
		Status:    string(org.Status),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, organization.ErrNotFound
		}
		return nil, err
	}
	return updateOrganizationRowToDomain(row), nil
}

func (r *OrgRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if err := r.q.SoftDeleteOrganizationMembershipsByOrganization(ctx, id); err != nil {
		return err
	}
	return r.q.SoftDeleteOrganization(ctx, id)
}

func (r *OrgRepository) CountAll(ctx context.Context) (int64, error) {
	return r.q.CountOrganizations(ctx)
}

func createOrganizationRowToDomain(row sqlc.CreateOrganizationRow) *organization.Organization {
	return &organization.Organization{
		ID:        row.ID,
		Name:      row.Name,
		Domain:    row.Domain,
		Workspace: row.Workspace,
		Status:    organization.Status(row.Status),
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
	}
}

func getOrganizationByIDRowToDomain(row sqlc.GetOrganizationByIDRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func getOrganizationByIDForUserRowToDomain(row sqlc.GetOrganizationByIDForUserRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func getOrganizationByDomainRowToDomain(row sqlc.GetOrganizationByDomainRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func getOrganizationByWorkspaceRowToDomain(row sqlc.GetOrganizationByWorkspaceRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func listOrganizationsRowToDomain(row sqlc.ListOrganizationsRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func listOrganizationsByUserRowToDomain(row sqlc.ListOrganizationsByUserRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func listOrganizationsByStatusRowToDomain(row sqlc.ListOrganizationsByStatusRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func listOrganizationsByUserAndStatusRowToDomain(row sqlc.ListOrganizationsByUserAndStatusRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func updateOrganizationRowToDomain(row sqlc.UpdateOrganizationRow) *organization.Organization {
	return &organization.Organization{ID: row.ID, Name: row.Name, Domain: row.Domain, Workspace: row.Workspace, Status: organization.Status(row.Status), CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}
