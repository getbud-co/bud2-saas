-- Migrate existing role values first, before adding the new constraint.
-- Adding the constraint before migrating data causes an immediate validation
-- failure for rows that still carry old role names.
UPDATE organization_memberships SET role = 'super-admin' WHERE role = 'admin';
UPDATE organization_memberships SET role = 'gestor'      WHERE role = 'manager';
UPDATE organization_memberships SET role = 'colaborador' WHERE role = 'collaborator';

-- Expand roles in organization_memberships (all rows now carry valid values)
ALTER TABLE organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_role_check;
ALTER TABLE organization_memberships ADD CONSTRAINT organization_memberships_role_check
  CHECK (role IN ('super-admin', 'admin-rh', 'gestor', 'colaborador', 'visualizador'));

-- Add new profile columns to users
ALTER TABLE users
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name  TEXT NOT NULL DEFAULT '',
  ADD COLUMN nickname   TEXT,
  ADD COLUMN job_title  TEXT,
  ADD COLUMN birth_date DATE,
  ADD COLUMN language   TEXT NOT NULL DEFAULT 'pt-br',
  ADD COLUMN gender     TEXT CHECK (gender IN ('feminino', 'masculino', 'nao-binario', 'prefiro-nao-dizer')),
  ADD COLUMN phone      TEXT;

-- Migrate name -> first_name / last_name
UPDATE users SET
  first_name = split_part(name, ' ', 1),
  last_name  = CASE
    WHEN position(' ' IN name) > 0 THEN substring(name FROM position(' ' IN name) + 1)
    ELSE ''
  END;

-- Guard: ensure no rows have an empty first_name before enforcing NOT NULL.
-- split_part returns '' when the name is blank; fall back to 'Usuário' in that case.
UPDATE users SET first_name = 'Usuário' WHERE TRIM(COALESCE(first_name, '')) = '';

ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users DROP COLUMN name;
