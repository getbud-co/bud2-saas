CREATE TABLE roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT        NOT NULL UNIQUE,
    name        TEXT        NOT NULL,
    description TEXT,
    type        TEXT        NOT NULL CHECK (type IN ('system', 'custom')),
    scope       TEXT        NOT NULL CHECK (scope IN ('self', 'team', 'org')),
    is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_type ON roles (type);

INSERT INTO roles (slug, name, description, type, scope, is_default) VALUES
    ('super-admin',   'Super Admin',   'Acesso total ao sistema',           'system', 'org',  FALSE),
    ('admin-rh',      'Admin RH',      'Gestão de pessoas e configurações', 'system', 'org',  FALSE),
    ('gestor',        'Gestor',        'Gestão do time direto',             'system', 'team', FALSE),
    ('colaborador',   'Colaborador',   'Acesso padrão para colaboradores',  'system', 'self', TRUE),
    ('visualizador',  'Visualizador',  'Acesso somente leitura',            'system', 'org',  FALSE);
