package postgres

import (
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

// ── pgtype helpers shared across repositories ────────────────────────────────

func textToPgtype(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func pgtypeToText(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	s := t.String
	return &s
}

func timeToPgtypeDate(t *time.Time) pgtype.Date {
	if t == nil {
		return pgtype.Date{Valid: false}
	}
	return pgtype.Date{Time: *t, Valid: true}
}

func pgtypeDateToTime(d pgtype.Date) *time.Time {
	if !d.Valid {
		return nil
	}
	t := d.Time
	return &t
}

func uuidPtrToPgtype(u *uuid.UUID) pgtype.UUID {
	if u == nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: *u, Valid: true}
}

func pgtypeToUUIDPtr(p pgtype.UUID) *uuid.UUID {
	if !p.Valid {
		return nil
	}
	v := uuid.UUID(p.Bytes)
	return &v
}

func timeToPgtypeTimestamptz(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

func pgtypeTimestamptzToTime(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	v := t.Time
	return &v
}

// float64PtrToPgtypeNumeric converts an optional float64 to a NUMERIC value.
// Goes through the textual representation because pgtype.Numeric does not
// expose a direct float64 setter — Float64Value reads, Scan writes from text.
func float64PtrToPgtypeNumeric(v *float64) pgtype.Numeric {
	if v == nil {
		return pgtype.Numeric{Valid: false}
	}
	var n pgtype.Numeric
	if err := n.Scan(strconv.FormatFloat(*v, 'f', -1, 64)); err != nil {
		return pgtype.Numeric{Valid: false}
	}
	return n
}

// pgtypeNumericToFloat64Ptr converts a NUMERIC back to *float64. Returns nil
// for NULL / NaN / Infinity (callers that need exact precision should use a
// decimal type instead — none in the codebase yet).
func pgtypeNumericToFloat64Ptr(n pgtype.Numeric) *float64 {
	if !n.Valid || n.NaN || n.InfinityModifier != pgtype.Finite {
		return nil
	}
	f8, err := n.Float64Value()
	if err != nil || !f8.Valid {
		return nil
	}
	v := f8.Float64
	return &v
}

// isUniqueViolation reports whether err is a Postgres unique-constraint
// violation (SQLSTATE 23505). Used by repositories that map duplicate-key
// errors to domain-level "name exists" errors.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// nonEmptyStr returns s if non-empty, otherwise fallback. Needed when writing
// NOT NULL TEXT columns with CHECK constraints that don't accept empty strings
// — passing an empty Go string would fail the check even though the DB has a
// DEFAULT value (DEFAULT only applies when the column is omitted entirely).
func nonEmptyStr(s, fallback string) string {
	if s == "" {
		return fallback
	}
	return s
}

// nonNilUUIDs returns s if non-nil, otherwise an empty slice. Needed when
// writing NOT NULL UUID[] columns that default to '{}' — a nil Go slice
// would be sent as SQL NULL, violating the constraint.
func nonNilUUIDs(s []uuid.UUID) []uuid.UUID {
	if s == nil {
		return []uuid.UUID{}
	}
	return s
}

// isFKViolation reports whether err is a Postgres foreign-key violation
// (SQLSTATE 23503). Used by repositories that map missing-reference errors
// to domain-level invalid-reference errors instead of leaking 500s when the
// app layer's pre-flight reference check loses to a TOCTOU (e.g., the
// referenced row was deleted between validation and INSERT).
func isFKViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23503"
}
