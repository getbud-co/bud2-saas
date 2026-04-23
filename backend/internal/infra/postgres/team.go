package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/getbud-co/bud2/backend/internal/domain/team"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type teamQuerier interface {
	CreateTeam(ctx context.Context, arg sqlc.CreateTeamParams) (sqlc.CreateTeamRow, error)
	GetTeamByID(ctx context.Context, arg sqlc.GetTeamByIDParams) (sqlc.GetTeamByIDRow, error)
	GetTeamByName(ctx context.Context, arg sqlc.GetTeamByNameParams) (sqlc.GetTeamByNameRow, error)
	ListTeams(ctx context.Context, arg sqlc.ListTeamsParams) ([]sqlc.ListTeamsRow, error)
	ListTeamsByStatus(ctx context.Context, arg sqlc.ListTeamsByStatusParams) ([]sqlc.ListTeamsByStatusRow, error)
	CountTeams(ctx context.Context, organizationID uuid.UUID) (int64, error)
	CountTeamsByStatus(ctx context.Context, arg sqlc.CountTeamsByStatusParams) (int64, error)
	UpdateTeam(ctx context.Context, arg sqlc.UpdateTeamParams) (sqlc.UpdateTeamRow, error)
	SoftDeleteTeam(ctx context.Context, arg sqlc.SoftDeleteTeamParams) error
	CreateTeamMember(ctx context.Context, arg sqlc.CreateTeamMemberParams) (sqlc.CreateTeamMemberRow, error)
	ListTeamMembers(ctx context.Context, arg sqlc.ListTeamMembersParams) ([]sqlc.ListTeamMembersRow, error)
	ListTeamMembersForSync(ctx context.Context, teamID uuid.UUID) ([]sqlc.ListTeamMembersForSyncRow, error)
	GetTeamMemberByTeamAndUser(ctx context.Context, arg sqlc.GetTeamMemberByTeamAndUserParams) (sqlc.GetTeamMemberByTeamAndUserRow, error)
	UpdateTeamMember(ctx context.Context, arg sqlc.UpdateTeamMemberParams) (sqlc.UpdateTeamMemberRow, error)
	SoftDeleteTeamMember(ctx context.Context, id uuid.UUID) error
	SoftDeleteTeamMembersByTeam(ctx context.Context, teamID uuid.UUID) error
	SoftDeleteTeamMembersByOrganizationUser(ctx context.Context, arg sqlc.SoftDeleteTeamMembersByOrganizationUserParams) error
	ListTeamMembersByOrganizationUser(ctx context.Context, arg sqlc.ListTeamMembersByOrganizationUserParams) ([]sqlc.ListTeamMembersByOrganizationUserRow, error)
	ListTeamMembersByOrganizationUsers(ctx context.Context, arg sqlc.ListTeamMembersByOrganizationUsersParams) ([]sqlc.ListTeamMembersByOrganizationUsersRow, error)
}

type TeamRepository struct {
	q teamQuerier
}

func NewTeamRepository(q teamQuerier) *TeamRepository {
	return &TeamRepository{q: q}
}

func (r *TeamRepository) Create(ctx context.Context, t *team.Team) (*team.Team, error) {
	row, err := r.q.CreateTeam(ctx, sqlc.CreateTeamParams{
		ID:             t.ID,
		OrganizationID: t.OrganizationID,
		Name:           t.Name,
		Description:    textToPgtype(t.Description),
		Color:          string(t.Color),
		Status:         string(t.Status),
	})
	if err != nil {
		return nil, err
	}
	created := teamRowToDomain(row.ID, row.OrganizationID, row.Name, row.Description, row.Color, row.Status, row.CreatedAt, row.UpdatedAt)
	created.Members = t.Members
	if err := r.syncMembers(ctx, created); err != nil {
		return nil, err
	}
	return created, nil
}

func (r *TeamRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*team.Team, error) {
	row, err := r.q.GetTeamByID(ctx, sqlc.GetTeamByIDParams{ID: id, OrganizationID: organizationID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, team.ErrNotFound
		}
		return nil, err
	}
	t := teamRowToDomain(row.ID, row.OrganizationID, row.Name, row.Description, row.Color, row.Status, row.CreatedAt, row.UpdatedAt)
	if err := r.loadMembers(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (r *TeamRepository) GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*team.Team, error) {
	row, err := r.q.GetTeamByName(ctx, sqlc.GetTeamByNameParams{OrganizationID: organizationID, Lower: name})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, team.ErrNotFound
		}
		return nil, err
	}
	return teamRowToDomain(row.ID, row.OrganizationID, row.Name, row.Description, row.Color, row.Status, row.CreatedAt, row.UpdatedAt), nil
}

func (r *TeamRepository) List(ctx context.Context, organizationID uuid.UUID, status *team.Status, page, size int) (team.ListResult, error) {
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	limit := int32(size)
	offset := int32((page - 1) * size)

	var teams []team.Team
	var total int64
	var err error

	if status != nil {
		rows, listErr := r.q.ListTeamsByStatus(ctx, sqlc.ListTeamsByStatusParams{
			OrganizationID: organizationID,
			Status:         string(*status),
			Limit:          limit,
			Offset:         offset,
		})
		if listErr != nil {
			return team.ListResult{}, listErr
		}
		total, err = r.q.CountTeamsByStatus(ctx, sqlc.CountTeamsByStatusParams{
			OrganizationID: organizationID,
			Status:         string(*status),
		})
		if err != nil {
			return team.ListResult{}, err
		}
		for _, row := range rows {
			teams = append(teams, *teamRowToDomain(row.ID, row.OrganizationID, row.Name, row.Description, row.Color, row.Status, row.CreatedAt, row.UpdatedAt))
		}
	} else {
		rows, listErr := r.q.ListTeams(ctx, sqlc.ListTeamsParams{
			OrganizationID: organizationID,
			Limit:          limit,
			Offset:         offset,
		})
		if listErr != nil {
			return team.ListResult{}, listErr
		}
		total, err = r.q.CountTeams(ctx, organizationID)
		if err != nil {
			return team.ListResult{}, err
		}
		for _, row := range rows {
			teams = append(teams, *teamRowToDomain(row.ID, row.OrganizationID, row.Name, row.Description, row.Color, row.Status, row.CreatedAt, row.UpdatedAt))
		}
	}

	for i := range teams {
		if err := r.loadMembers(ctx, &teams[i]); err != nil {
			return team.ListResult{}, err
		}
	}

	return team.ListResult{Teams: teams, Total: total}, nil
}

func (r *TeamRepository) Update(ctx context.Context, t *team.Team) (*team.Team, error) {
	row, err := r.q.UpdateTeam(ctx, sqlc.UpdateTeamParams{
		ID:             t.ID,
		OrganizationID: t.OrganizationID,
		Name:           t.Name,
		Description:    textToPgtype(t.Description),
		Color:          string(t.Color),
		Status:         string(t.Status),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, team.ErrNotFound
		}
		return nil, err
	}
	updated := teamRowToDomain(row.ID, row.OrganizationID, row.Name, row.Description, row.Color, row.Status, row.CreatedAt, row.UpdatedAt)
	updated.Members = t.Members
	if err := r.syncMembers(ctx, updated); err != nil {
		return nil, err
	}
	return updated, nil
}

func (r *TeamRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	if err := r.q.SoftDeleteTeamMembersByTeam(ctx, id); err != nil {
		return err
	}
	return r.q.SoftDeleteTeam(ctx, sqlc.SoftDeleteTeamParams{ID: id, OrganizationID: organizationID})
}

func (r *TeamRepository) SoftDeleteMemberByUser(ctx context.Context, organizationID, userID uuid.UUID) error {
	return r.q.SoftDeleteTeamMembersByOrganizationUser(ctx, sqlc.SoftDeleteTeamMembersByOrganizationUserParams{
		OrganizationID: organizationID,
		UserID:         userID,
	})
}

func (r *TeamRepository) ListMembersByUser(ctx context.Context, organizationID, userID uuid.UUID) ([]team.TeamMember, error) {
	rows, err := r.q.ListTeamMembersByOrganizationUser(ctx, sqlc.ListTeamMembersByOrganizationUserParams{
		OrganizationID: organizationID,
		UserID:         userID,
	})
	if err != nil {
		return nil, err
	}
	members := make([]team.TeamMember, len(rows))
	for i, row := range rows {
		members[i] = team.TeamMember{
			ID:         row.ID,
			TeamID:     row.TeamID,
			UserID:     row.UserID,
			RoleInTeam: team.RoleInTeam(row.RoleInTeam),
			JoinedAt:   row.JoinedAt,
			CreatedAt:  row.CreatedAt,
			UpdatedAt:  row.UpdatedAt,
		}
	}
	return members, nil
}

func (r *TeamRepository) ListTeamIDsByUsers(ctx context.Context, organizationID uuid.UUID, userIDs []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	if len(userIDs) == 0 {
		return make(map[uuid.UUID][]uuid.UUID), nil
	}
	rows, err := r.q.ListTeamMembersByOrganizationUsers(ctx, sqlc.ListTeamMembersByOrganizationUsersParams{
		OrganizationID: organizationID,
		UserIds:        userIDs,
	})
	if err != nil {
		return nil, err
	}
	result := make(map[uuid.UUID][]uuid.UUID)
	for _, row := range rows {
		result[row.UserID] = append(result[row.UserID], row.TeamID)
	}
	return result, nil
}

func (r *TeamRepository) SyncMembersByUser(ctx context.Context, organizationID, userID uuid.UUID, teamIDs []uuid.UUID, defaultRole team.RoleInTeam) error {
	current, err := r.q.ListTeamMembersByOrganizationUser(ctx, sqlc.ListTeamMembersByOrganizationUserParams{
		OrganizationID: organizationID,
		UserID:         userID,
	})
	if err != nil {
		return err
	}

	currentByTeamID := make(map[uuid.UUID]sqlc.ListTeamMembersByOrganizationUserRow, len(current))
	for _, c := range current {
		currentByTeamID[c.TeamID] = c
	}

	desiredTeamIDs := make(map[uuid.UUID]struct{}, len(teamIDs))
	for _, tid := range teamIDs {
		desiredTeamIDs[tid] = struct{}{}
		if _, exists := currentByTeamID[tid]; !exists {
			if _, createErr := r.q.CreateTeamMember(ctx, sqlc.CreateTeamMemberParams{
				TeamID:     tid,
				UserID:     userID,
				RoleInTeam: string(defaultRole),
			}); createErr != nil {
				return createErr
			}
		}
	}

	for teamID, c := range currentByTeamID {
		if _, keep := desiredTeamIDs[teamID]; !keep {
			if err := r.q.SoftDeleteTeamMember(ctx, c.ID); err != nil {
				return err
			}
		}
	}

	return nil
}

// ── Member helpers ────────────────────────────────────────────────────────────

func (r *TeamRepository) loadMembers(ctx context.Context, t *team.Team) error {
	rows, err := r.q.ListTeamMembers(ctx, sqlc.ListTeamMembersParams{TeamID: t.ID, OrganizationID: t.OrganizationID})
	if err != nil {
		return err
	}
	t.Members = make([]team.TeamMember, len(rows))
	for i, row := range rows {
		t.Members[i] = listTeamMembersRowToDomain(row)
	}
	return nil
}

func (r *TeamRepository) syncMembers(ctx context.Context, t *team.Team) error {
	// Load current members from DB to detect removals.
	existing, err := r.q.ListTeamMembersForSync(ctx, t.ID)
	if err != nil {
		return err
	}
	existingByUserID := make(map[uuid.UUID]sqlc.ListTeamMembersForSyncRow, len(existing))
	for _, e := range existing {
		existingByUserID[e.UserID] = e
	}

	desiredUserIDs := make(map[uuid.UUID]struct{}, len(t.Members))
	for i := range t.Members {
		m := &t.Members[i]
		desiredUserIDs[m.UserID] = struct{}{}

		if existing, found := existingByUserID[m.UserID]; found {
			// Member already exists — update role if changed.
			if existing.RoleInTeam != string(m.RoleInTeam) {
				row, updateErr := r.q.UpdateTeamMember(ctx, sqlc.UpdateTeamMemberParams{
					ID:         existing.ID,
					RoleInTeam: string(m.RoleInTeam),
				})
				if updateErr != nil {
					return updateErr
				}
				m.ID = row.ID
				m.TeamID = row.TeamID
				m.JoinedAt = existing.JoinedAt
				m.CreatedAt = existing.CreatedAt
				m.UpdatedAt = row.UpdatedAt
			} else {
				m.ID = existing.ID
				m.TeamID = existing.TeamID
				m.JoinedAt = existing.JoinedAt
				m.CreatedAt = existing.CreatedAt
				m.UpdatedAt = existing.UpdatedAt
			}
		} else {
			// New member — insert.
			row, createErr := r.q.CreateTeamMember(ctx, sqlc.CreateTeamMemberParams{
				TeamID:     t.ID,
				UserID:     m.UserID,
				RoleInTeam: string(m.RoleInTeam),
			})
			if createErr != nil {
				return createErr
			}
			m.ID = row.ID
			m.TeamID = row.TeamID
			m.JoinedAt = row.JoinedAt
			m.CreatedAt = row.CreatedAt
			m.UpdatedAt = row.UpdatedAt
		}
	}

	// Soft-delete members removed from the desired set.
	for userID, e := range existingByUserID {
		if _, keep := desiredUserIDs[userID]; !keep {
			if err := r.q.SoftDeleteTeamMember(ctx, e.ID); err != nil {
				return err
			}
		}
	}

	return nil
}

// ── Row mappers ───────────────────────────────────────────────────────────────

func teamRowToDomain(
	id, organizationID uuid.UUID,
	name string,
	description pgtype.Text,
	color, status string,
	createdAt, updatedAt time.Time,
) *team.Team {
	return &team.Team{
		ID:             id,
		OrganizationID: organizationID,
		Name:           name,
		Description:    pgtypeToText(description),
		Color:          team.Color(color),
		Status:         team.Status(status),
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}
}

func listTeamMembersRowToDomain(row sqlc.ListTeamMembersRow) team.TeamMember {
	firstName := row.FirstName
	lastName := row.LastName
	m := team.TeamMember{
		ID:            row.ID,
		TeamID:        row.TeamID,
		UserID:        row.UserID,
		RoleInTeam:    team.RoleInTeam(row.RoleInTeam),
		JoinedAt:      row.JoinedAt,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
		UserFirstName: &firstName,
		UserLastName:  &lastName,
	}
	if row.JobTitle.Valid {
		s := row.JobTitle.String
		m.UserJobTitle = &s
	}
	return m
}
