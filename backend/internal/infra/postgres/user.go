package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type userQuerier interface {
	CreateUser(ctx context.Context, arg sqlc.CreateUserParams) (sqlc.CreateUserRow, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (sqlc.GetUserByIDRow, error)
	GetUserByEmail(ctx context.Context, lower string) (sqlc.GetUserByEmailRow, error)
	ListOrganizationUsers(ctx context.Context, arg sqlc.ListOrganizationUsersParams) ([]sqlc.ListOrganizationUsersRow, error)
	CountOrganizationUsers(ctx context.Context, organizationID uuid.UUID) (int64, error)
	ListOrganizationUsersByStatus(ctx context.Context, arg sqlc.ListOrganizationUsersByStatusParams) ([]sqlc.ListOrganizationUsersByStatusRow, error)
	CountOrganizationUsersByStatus(ctx context.Context, arg sqlc.CountOrganizationUsersByStatusParams) (int64, error)
	UpdateUser(ctx context.Context, arg sqlc.UpdateUserParams) (sqlc.UpdateUserRow, error)
	CreateOrganizationMembership(ctx context.Context, arg sqlc.CreateOrganizationMembershipParams) (sqlc.CreateOrganizationMembershipRow, error)
	ListOrganizationMemberships(ctx context.Context, arg sqlc.ListOrganizationMembershipsParams) ([]sqlc.ListOrganizationMembershipsRow, error)
	CountOrganizationMemberships(ctx context.Context, organizationID uuid.UUID) (int64, error)
	ListUserMemberships(ctx context.Context, arg sqlc.ListUserMembershipsParams) ([]sqlc.ListUserMembershipsRow, error)
	ListUserMembershipsForOrganization(ctx context.Context, arg sqlc.ListUserMembershipsForOrganizationParams) ([]sqlc.ListUserMembershipsForOrganizationRow, error)
	SoftDeleteOrganizationMembership(ctx context.Context, arg sqlc.SoftDeleteOrganizationMembershipParams) error
	UpdateOrganizationMembership(ctx context.Context, arg sqlc.UpdateOrganizationMembershipParams) (sqlc.UpdateOrganizationMembershipRow, error)
	ActivateInvitedMemberships(ctx context.Context, userID uuid.UUID) error
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
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		Email:         u.Email,
		PasswordHash:  u.PasswordHash,
		Status:        string(u.Status),
		IsSystemAdmin: u.IsSystemAdmin,
		Nickname:      textToPgtype(u.Nickname),
		JobTitle:      textToPgtype(u.JobTitle),
		BirthDate:     timeToPgtypeDate(u.BirthDate),
		Language:      u.Language,
		Gender:        textToPgtype(u.Gender),
		Phone:         textToPgtype(u.Phone),
	})
	if err != nil {
		return nil, err
	}
	created := createUserRowToDomain(row)
	created.Memberships = u.Memberships
	if err := r.syncMemberships(ctx, created); err != nil {
		return nil, err
	}
	return created, nil
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

func (r *UserRepository) GetByIDForOrganization(ctx context.Context, id, organizationID uuid.UUID) (*user.User, error) {
	row, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, user.ErrNotFound
		}
		return nil, err
	}
	result := getUserByIDRowToDomain(row)
	if err := r.loadMembershipsForOrganization(ctx, result, organizationID); err != nil {
		return nil, err
	}
	if _, err := result.MembershipForOrganization(organizationID); err != nil {
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

func (r *UserRepository) ListByOrganization(ctx context.Context, organizationID uuid.UUID, status *user.Status, page, size int) (user.ListResult, error) {
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	limit := int32(size)
	offset := int32((page - 1) * size)

	var rowsFiltered []sqlc.ListOrganizationUsersByStatusRow
	var rowsUnfiltered []sqlc.ListOrganizationUsersRow
	var total int64
	var err error

	if status != nil {
		rowsFiltered, err = r.q.ListOrganizationUsersByStatus(ctx, sqlc.ListOrganizationUsersByStatusParams{
			OrganizationID: organizationID,
			Status:         string(*status),
			Limit:          limit,
			Offset:         offset,
		})
		if err != nil {
			return user.ListResult{}, err
		}
		total, err = r.q.CountOrganizationUsersByStatus(ctx, sqlc.CountOrganizationUsersByStatusParams{
			OrganizationID: organizationID,
			Status:         string(*status),
		})
	} else {
		rowsUnfiltered, err = r.q.ListOrganizationUsers(ctx, sqlc.ListOrganizationUsersParams{
			OrganizationID: organizationID,
			Limit:          limit,
			Offset:         offset,
		})
		if err != nil {
			return user.ListResult{}, err
		}
		total, err = r.q.CountOrganizationUsers(ctx, organizationID)
	}
	if err != nil {
		return user.ListResult{}, err
	}

	usersOut := make([]user.User, 0, len(rowsFiltered)+len(rowsUnfiltered))
	for _, row := range rowsFiltered {
		usersOut = append(usersOut, *listOrganizationUsersByStatusRowToDomain(row, organizationID))
	}
	for _, row := range rowsUnfiltered {
		usersOut = append(usersOut, *listOrganizationUsersRowToDomain(row, organizationID))
	}
	return user.ListResult{Users: usersOut, Total: total}, nil
}

func (r *UserRepository) Update(ctx context.Context, u *user.User) (*user.User, error) {
	row, err := r.q.UpdateUser(ctx, sqlc.UpdateUserParams{
		ID:            u.ID,
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		Email:         u.Email,
		PasswordHash:  u.PasswordHash,
		Status:        string(u.Status),
		IsSystemAdmin: u.IsSystemAdmin,
		Nickname:      textToPgtype(u.Nickname),
		JobTitle:      textToPgtype(u.JobTitle),
		BirthDate:     timeToPgtypeDate(u.BirthDate),
		Language:      u.Language,
		Gender:        textToPgtype(u.Gender),
		Phone:         textToPgtype(u.Phone),
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
	return updated, nil
}

func (r *UserRepository) DeleteMembership(ctx context.Context, organizationID, userID uuid.UUID) error {
	return r.q.SoftDeleteOrganizationMembership(ctx, sqlc.SoftDeleteOrganizationMembershipParams{
		OrganizationID: organizationID,
		UserID:         userID,
	})
}

func (r *UserRepository) ActivateInvitedMemberships(ctx context.Context, userID uuid.UUID) error {
	return r.q.ActivateInvitedMemberships(ctx, userID)
}

// ── Row mappers ───────────────────────────────────────────────────────────────

func populateUser(
	id uuid.UUID,
	firstName, lastName, email, passwordHash, status string,
	isSystemAdmin bool,
	nickname, jobTitle pgtype.Text,
	birthDate pgtype.Date,
	language string,
	gender, phone pgtype.Text,
	createdAt, updatedAt time.Time,
	memberships []organization.Membership,
) *user.User {
	u := &user.User{
		ID:            id,
		FirstName:     firstName,
		LastName:      lastName,
		Email:         email,
		PasswordHash:  passwordHash,
		Status:        user.Status(status),
		IsSystemAdmin: isSystemAdmin,
		Nickname:      pgtypeToText(nickname),
		JobTitle:      pgtypeToText(jobTitle),
		BirthDate:     pgtypeDateToTime(birthDate),
		Language:      language,
		Gender:        pgtypeToText(gender),
		Phone:         pgtypeToText(phone),
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
		Memberships:   memberships,
	}
	return u
}

func createUserRowToDomain(row sqlc.CreateUserRow) *user.User {
	return populateUser(row.ID, row.FirstName, row.LastName, row.Email, row.PasswordHash, row.Status,
		row.IsSystemAdmin, row.Nickname, row.JobTitle, row.BirthDate, row.Language, row.Gender, row.Phone,
		row.CreatedAt, row.UpdatedAt, nil)
}

func getUserByIDRowToDomain(row sqlc.GetUserByIDRow) *user.User {
	return populateUser(row.ID, row.FirstName, row.LastName, row.Email, row.PasswordHash, row.Status,
		row.IsSystemAdmin, row.Nickname, row.JobTitle, row.BirthDate, row.Language, row.Gender, row.Phone,
		row.CreatedAt, row.UpdatedAt, nil)
}

func getUserByEmailRowToDomain(row sqlc.GetUserByEmailRow) *user.User {
	return populateUser(row.ID, row.FirstName, row.LastName, row.Email, row.PasswordHash, row.Status,
		row.IsSystemAdmin, row.Nickname, row.JobTitle, row.BirthDate, row.Language, row.Gender, row.Phone,
		row.CreatedAt, row.UpdatedAt, nil)
}

func listOrganizationUsersRowToDomain(row sqlc.ListOrganizationUsersRow, orgID uuid.UUID) *user.User {
	return populateUser(row.ID, row.FirstName, row.LastName, row.Email, row.PasswordHash, row.Status,
		row.IsSystemAdmin, row.Nickname, row.JobTitle, row.BirthDate, row.Language, row.Gender, row.Phone,
		row.CreatedAt, row.UpdatedAt, []organization.Membership{{
			OrganizationID: orgID,
			Role:           organization.MembershipRole(row.MembershipRole),
			Status:         organization.MembershipStatus(row.MembershipStatus),
		}})
}

func listOrganizationUsersByStatusRowToDomain(row sqlc.ListOrganizationUsersByStatusRow, orgID uuid.UUID) *user.User {
	return populateUser(row.ID, row.FirstName, row.LastName, row.Email, row.PasswordHash, row.Status,
		row.IsSystemAdmin, row.Nickname, row.JobTitle, row.BirthDate, row.Language, row.Gender, row.Phone,
		row.CreatedAt, row.UpdatedAt, []organization.Membership{{
			OrganizationID: orgID,
			Role:           organization.MembershipRole(row.MembershipRole),
			Status:         organization.MembershipStatus(row.MembershipStatus),
		}})
}

func updateUserRowToDomain(row sqlc.UpdateUserRow) *user.User {
	return populateUser(row.ID, row.FirstName, row.LastName, row.Email, row.PasswordHash, row.Status,
		row.IsSystemAdmin, row.Nickname, row.JobTitle, row.BirthDate, row.Language, row.Gender, row.Phone,
		row.CreatedAt, row.UpdatedAt, nil)
}

// pgtype helpers live in helpers.go (shared across repositories).

// ── Membership helpers ────────────────────────────────────────────────────────

// loadMemberships loads all memberships for a user across all organizations.
// Use with caution: it does not filter by tenant. Prefer loadMembershipsForOrganization
// when operating within a known tenant scope.
func (r *UserRepository) loadMemberships(ctx context.Context, u *user.User) error {
	rows, err := r.q.ListUserMemberships(ctx, sqlc.ListUserMembershipsParams{
		UserID: u.ID,
		Limit:  1000,
		Offset: 0,
	})
	if err != nil {
		return err
	}
	u.Memberships = make([]organization.Membership, len(rows))
	for i := range rows {
		u.Memberships[i] = *listUserMembershipsRowToMembership(rows[i])
	}
	return nil
}

func (r *UserRepository) loadMembershipsForOrganization(ctx context.Context, u *user.User, organizationID uuid.UUID) error {
	rows, err := r.q.ListUserMembershipsForOrganization(ctx, sqlc.ListUserMembershipsForOrganizationParams{
		UserID:         u.ID,
		OrganizationID: organizationID,
	})
	if err != nil {
		return err
	}
	u.Memberships = make([]organization.Membership, len(rows))
	for i := range rows {
		u.Memberships[i] = *listUserMembershipsForOrganizationRowToMembership(rows[i])
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

func createOrganizationMembershipRowToMembership(row sqlc.CreateOrganizationMembershipRow) *organization.Membership {
	return membershipRowToDomain(row.ID, row.OrganizationID, row.UserID, row.Role, row.Status, row.InvitedByUserID, row.JoinedAt, row.CreatedAt, row.UpdatedAt)
}

func listUserMembershipsRowToMembership(row sqlc.ListUserMembershipsRow) *organization.Membership {
	return membershipRowToDomain(row.ID, row.OrganizationID, row.UserID, row.Role, row.Status, row.InvitedByUserID, row.JoinedAt, row.CreatedAt, row.UpdatedAt)
}

func listUserMembershipsForOrganizationRowToMembership(row sqlc.ListUserMembershipsForOrganizationRow) *organization.Membership {
	return membershipRowToDomain(row.ID, row.OrganizationID, row.UserID, row.Role, row.Status, row.InvitedByUserID, row.JoinedAt, row.CreatedAt, row.UpdatedAt)
}

func updateOrganizationMembershipRowToMembership(row sqlc.UpdateOrganizationMembershipRow) *organization.Membership {
	return membershipRowToDomain(row.ID, row.OrganizationID, row.UserID, row.Role, row.Status, row.InvitedByUserID, row.JoinedAt, row.CreatedAt, row.UpdatedAt)
}

func membershipRowToDomain(id, organizationID, userID uuid.UUID, role, status string, invitedByUserID pgtype.UUID, joinedAt pgtype.Timestamptz, createdAt, updatedAt time.Time) *organization.Membership {
	result := &organization.Membership{
		ID:             id,
		OrganizationID: organizationID,
		UserID:         userID,
		Role:           organization.MembershipRole(role),
		Status:         organization.MembershipStatus(status),
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
