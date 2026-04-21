package postgres

import (
	"context"
	"errors"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type userQuerier interface {
	CreateUser(ctx context.Context, arg sqlc.CreateUserParams) (sqlc.CreateUserRow, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (sqlc.GetUserByIDRow, error)
	GetUserByEmail(ctx context.Context, lower string) (sqlc.GetUserByEmailRow, error)
	ListUsers(ctx context.Context, arg sqlc.ListUsersParams) ([]sqlc.ListUsersRow, error)
	ListUsersByStatus(ctx context.Context, arg sqlc.ListUsersByStatusParams) ([]sqlc.ListUsersByStatusRow, error)
	SearchUsers(ctx context.Context, arg sqlc.SearchUsersParams) ([]sqlc.SearchUsersRow, error)
	CountUsers(ctx context.Context) (int64, error)
	CountUsersByStatus(ctx context.Context, status string) (int64, error)
	CountSearchUsers(ctx context.Context, name string) (int64, error)
	UpdateUser(ctx context.Context, arg sqlc.UpdateUserParams) (sqlc.UpdateUserRow, error)
	CreateOrganizationMembership(ctx context.Context, arg sqlc.CreateOrganizationMembershipParams) (sqlc.CreateOrganizationMembershipRow, error)
	ListOrganizationMemberships(ctx context.Context, arg sqlc.ListOrganizationMembershipsParams) ([]sqlc.ListOrganizationMembershipsRow, error)
	CountOrganizationMemberships(ctx context.Context, organizationID uuid.UUID) (int64, error)
	ListUserMemberships(ctx context.Context, arg sqlc.ListUserMembershipsParams) ([]sqlc.ListUserMembershipsRow, error)
	UpdateOrganizationMembership(ctx context.Context, arg sqlc.UpdateOrganizationMembershipParams) (sqlc.UpdateOrganizationMembershipRow, error)
}

type UserRepository struct {
	q userQuerier
}

func NewUserRepository(q userQuerier) *UserRepository {
	return &UserRepository{q: q}
}

func (r *UserRepository) Create(ctx context.Context, u *user.User) (*user.User, error) {
	row, err := r.q.CreateUser(ctx, sqlc.CreateUserParams{
		ID:            u.ID,
		Name:          u.Name,
		Email:         u.Email,
		PasswordHash:  u.PasswordHash,
		Status:        string(u.Status),
		IsSystemAdmin: u.IsSystemAdmin,
	})
	if err != nil {
		return nil, err
	}
	created := createUserRowToDomain(row)
	created.Memberships = u.Memberships
	if err := r.syncMemberships(ctx, created); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, created.ID)
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*user.User, error) {
	row, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, user.ErrNotFound
		}
		return nil, err
	}
	result := getUserByIDRowToDomain(row)
	if err := r.loadMemberships(ctx, result); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	row, err := r.q.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, user.ErrNotFound
		}
		return nil, err
	}
	result := getUserByEmailRowToDomain(row)
	if err := r.loadMemberships(ctx, result); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *UserRepository) List(ctx context.Context, filter user.ListFilter) (user.ListResult, error) {
	limit := int32(filter.Size)
	offset := int32((filter.Page - 1) * filter.Size)
	var usersOut []user.User
	var total int64
	var err error

	switch {
	case filter.Search != nil:
		pattern := "%" + *filter.Search + "%"
		rows, listErr := r.q.SearchUsers(ctx, sqlc.SearchUsersParams{
			Name:   pattern,
			Limit:  limit,
			Offset: offset,
		})
		if listErr != nil {
			return user.ListResult{}, listErr
		}
		usersOut = make([]user.User, len(rows))
		for i, row := range rows {
			usersOut[i] = *searchUsersRowToDomain(row)
		}
		total, err = r.q.CountSearchUsers(ctx, pattern)
	case filter.Status != nil:
		rows, listErr := r.q.ListUsersByStatus(ctx, sqlc.ListUsersByStatusParams{
			Status: string(*filter.Status),
			Limit:  limit,
			Offset: offset,
		})
		if listErr != nil {
			return user.ListResult{}, listErr
		}
		usersOut = make([]user.User, len(rows))
		for i, row := range rows {
			usersOut[i] = *listUsersByStatusRowToDomain(row)
		}
		total, err = r.q.CountUsersByStatus(ctx, string(*filter.Status))
	default:
		rows, listErr := r.q.ListUsers(ctx, sqlc.ListUsersParams{
			Limit:  limit,
			Offset: offset,
		})
		if listErr != nil {
			return user.ListResult{}, listErr
		}
		usersOut = make([]user.User, len(rows))
		for i, row := range rows {
			usersOut[i] = *listUsersRowToDomain(row)
		}
		total, err = r.q.CountUsers(ctx)
	}

	if err != nil {
		return user.ListResult{}, err
	}

	return user.ListResult{Users: usersOut, Total: total}, nil
}

func (r *UserRepository) ListByOrganization(ctx context.Context, organizationID uuid.UUID, status *user.Status, page, size int) (user.ListResult, error) {
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	limit := int32(size)
	offset := int32((page - 1) * size)

	var rows []membership.Membership
	var total int64
	if status == nil {
		result, err := r.q.ListOrganizationMemberships(ctx, sqlc.ListOrganizationMembershipsParams{
			OrganizationID: organizationID,
			Limit:          limit,
			Offset:         offset,
		})
		if err != nil {
			return user.ListResult{}, err
		}
		rows = make([]membership.Membership, len(result))
		for i := range result {
			rows[i] = *listOrganizationMembershipsRowToMembership(result[i])
		}
		total, err = r.q.CountOrganizationMemberships(ctx, organizationID)
		if err != nil {
			return user.ListResult{}, err
		}

		usersOut := make([]user.User, 0, len(rows))
		for _, item := range rows {
			u, err := r.GetByID(ctx, item.UserID)
			if err != nil {
				return user.ListResult{}, err
			}
			usersOut = append(usersOut, *u)
		}
		return user.ListResult{Users: usersOut, Total: total}, nil
	}

	result, err := r.q.ListOrganizationMemberships(ctx, sqlc.ListOrganizationMembershipsParams{
		OrganizationID: organizationID,
		Limit:          math.MaxInt32,
		Offset:         0,
	})
	if err != nil {
		return user.ListResult{}, err
	}
	rows = make([]membership.Membership, len(result))
	for i := range result {
		rows[i] = *listOrganizationMembershipsRowToMembership(result[i])
	}

	filteredUsers := make([]user.User, 0, len(rows))
	for _, item := range rows {
		u, err := r.GetByID(ctx, item.UserID)
		if err != nil {
			return user.ListResult{}, err
		}
		if u.Status == *status {
			filteredUsers = append(filteredUsers, *u)
		}
	}

	total = int64(len(filteredUsers))
	start := int(offset)
	if start >= len(filteredUsers) {
		return user.ListResult{Users: []user.User{}, Total: total}, nil
	}
	end := start + int(limit)
	if end > len(filteredUsers) {
		end = len(filteredUsers)
	}
	return user.ListResult{Users: filteredUsers[start:end], Total: total}, nil
}

func (r *UserRepository) Update(ctx context.Context, u *user.User) (*user.User, error) {
	row, err := r.q.UpdateUser(ctx, sqlc.UpdateUserParams{
		ID:            u.ID,
		Name:          u.Name,
		Email:         u.Email,
		PasswordHash:  u.PasswordHash,
		Status:        string(u.Status),
		IsSystemAdmin: u.IsSystemAdmin,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, user.ErrNotFound
		}
		return nil, err
	}
	updated := updateUserRowToDomain(row)
	updated.Memberships = u.Memberships
	if err := r.syncMemberships(ctx, updated); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, updated.ID)
}

func createUserRowToDomain(row sqlc.CreateUserRow) *user.User {
	return &user.User{
		ID:            row.ID,
		Name:          row.Name,
		Email:         row.Email,
		PasswordHash:  row.PasswordHash,
		Status:        user.Status(row.Status),
		IsSystemAdmin: row.IsSystemAdmin,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}
}

func getUserByIDRowToDomain(row sqlc.GetUserByIDRow) *user.User {
	return &user.User{ID: row.ID, Name: row.Name, Email: row.Email, PasswordHash: row.PasswordHash, Status: user.Status(row.Status), IsSystemAdmin: row.IsSystemAdmin, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func getUserByEmailRowToDomain(row sqlc.GetUserByEmailRow) *user.User {
	return &user.User{ID: row.ID, Name: row.Name, Email: row.Email, PasswordHash: row.PasswordHash, Status: user.Status(row.Status), IsSystemAdmin: row.IsSystemAdmin, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func listUsersRowToDomain(row sqlc.ListUsersRow) *user.User {
	return &user.User{ID: row.ID, Name: row.Name, Email: row.Email, PasswordHash: row.PasswordHash, Status: user.Status(row.Status), IsSystemAdmin: row.IsSystemAdmin, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func listUsersByStatusRowToDomain(row sqlc.ListUsersByStatusRow) *user.User {
	return &user.User{ID: row.ID, Name: row.Name, Email: row.Email, PasswordHash: row.PasswordHash, Status: user.Status(row.Status), IsSystemAdmin: row.IsSystemAdmin, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func searchUsersRowToDomain(row sqlc.SearchUsersRow) *user.User {
	return &user.User{ID: row.ID, Name: row.Name, Email: row.Email, PasswordHash: row.PasswordHash, Status: user.Status(row.Status), IsSystemAdmin: row.IsSystemAdmin, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func updateUserRowToDomain(row sqlc.UpdateUserRow) *user.User {
	return &user.User{ID: row.ID, Name: row.Name, Email: row.Email, PasswordHash: row.PasswordHash, Status: user.Status(row.Status), IsSystemAdmin: row.IsSystemAdmin, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}

func (r *UserRepository) loadMemberships(ctx context.Context, u *user.User) error {
	rows, err := r.q.ListUserMemberships(ctx, sqlc.ListUserMembershipsParams{
		UserID: u.ID,
		Limit:  1000,
		Offset: 0,
	})
	if err != nil {
		return err
	}
	u.Memberships = make([]membership.Membership, len(rows))
	for i := range rows {
		u.Memberships[i] = *listUserMembershipsRowToMembership(rows[i])
	}
	return nil
}

func (r *UserRepository) syncMemberships(ctx context.Context, u *user.User) error {
	for i := range u.Memberships {
		m := &u.Memberships[i]
		m.UserID = u.ID
		if m.ID == uuid.Nil {
			row, err := r.q.CreateOrganizationMembership(ctx, sqlc.CreateOrganizationMembershipParams{
				OrganizationID: m.OrganizationID,
				UserID:         m.UserID,
				Role:           string(m.Role),
				Status:         string(m.Status),
			})
			if err != nil {
				return err
			}
			created := createOrganizationMembershipRowToMembership(row)
			*m = *created
			continue
		}

		row, err := r.q.UpdateOrganizationMembership(ctx, sqlc.UpdateOrganizationMembershipParams{
			ID:     m.ID,
			Role:   string(m.Role),
			Status: string(m.Status),
		})
		if err != nil {
			return err
		}
		updated := updateOrganizationMembershipRowToMembership(row)
		*m = *updated
	}
	return nil
}

func createOrganizationMembershipRowToMembership(row sqlc.CreateOrganizationMembershipRow) *membership.Membership {
	return membershipRowToDomain(row.ID, row.OrganizationID, row.UserID, row.Role, row.Status, row.InvitedByUserID, row.JoinedAt, row.CreatedAt, row.UpdatedAt)
}

func listOrganizationMembershipsRowToMembership(row sqlc.ListOrganizationMembershipsRow) *membership.Membership {
	return membershipRowToDomain(row.ID, row.OrganizationID, row.UserID, row.Role, row.Status, row.InvitedByUserID, row.JoinedAt, row.CreatedAt, row.UpdatedAt)
}

func listUserMembershipsRowToMembership(row sqlc.ListUserMembershipsRow) *membership.Membership {
	return membershipRowToDomain(row.ID, row.OrganizationID, row.UserID, row.Role, row.Status, row.InvitedByUserID, row.JoinedAt, row.CreatedAt, row.UpdatedAt)
}

func updateOrganizationMembershipRowToMembership(row sqlc.UpdateOrganizationMembershipRow) *membership.Membership {
	return membershipRowToDomain(row.ID, row.OrganizationID, row.UserID, row.Role, row.Status, row.InvitedByUserID, row.JoinedAt, row.CreatedAt, row.UpdatedAt)
}

func membershipRowToDomain(id, organizationID, userID uuid.UUID, role, status string, invitedByUserID pgtype.UUID, joinedAt pgtype.Timestamptz, createdAt, updatedAt time.Time) *membership.Membership {
	result := &membership.Membership{
		ID:             id,
		OrganizationID: organizationID,
		UserID:         userID,
		Role:           membership.Role(role),
		Status:         membership.Status(status),
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}
	if invitedByUserID.Valid {
		value := uuid.UUID(invitedByUserID.Bytes)
		result.InvitedByUserID = &value
	}
	if joinedAt.Valid {
		value := joinedAt.Time
		result.JoinedAt = &value
	}
	return result
}
