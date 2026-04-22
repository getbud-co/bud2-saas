-- Restore name column from first_name / last_name
ALTER TABLE users ADD COLUMN name TEXT;
UPDATE users SET name = TRIM(first_name || ' ' || last_name);
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

ALTER TABLE users
  DROP COLUMN first_name,
  DROP COLUMN last_name,
  DROP COLUMN nickname,
  DROP COLUMN job_title,
  DROP COLUMN birth_date,
  DROP COLUMN language,
  DROP COLUMN gender,
  DROP COLUMN phone;

-- Restore original role values in organization_memberships
ALTER TABLE organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_role_check;

UPDATE organization_memberships SET role = 'admin'        WHERE role = 'super-admin';
UPDATE organization_memberships SET role = 'admin'        WHERE role = 'admin-rh';
UPDATE organization_memberships SET role = 'manager'      WHERE role = 'gestor';
UPDATE organization_memberships SET role = 'collaborator' WHERE role = 'colaborador';
UPDATE organization_memberships SET role = 'collaborator' WHERE role = 'visualizador';

ALTER TABLE organization_memberships ADD CONSTRAINT organization_memberships_role_check
  CHECK (role IN ('admin', 'manager', 'collaborator'));
