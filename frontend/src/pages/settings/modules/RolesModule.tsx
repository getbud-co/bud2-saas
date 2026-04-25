import { useMemo, useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Badge,
  Checkbox,
  ChoiceBox,
  ChoiceBoxGroup,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
  Accordion,
  AccordionItem,
  toast,
} from "@getbud-co/buds";
import {
  Plus,
  Crown,
  Users,
  UserCircle,
  Eye,
  ShieldCheck,
  Lock,
  MagnifyingGlass,
  Target,
  ClipboardText,
  Gear,
  Binoculars,
  Lightning,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { PermissionGroup, DataScope } from "@/types";
import { useRoles, usePermissions, type Role, type Permission } from "@/hooks/use-roles";
import { apiErrorToMessage } from "@/lib/api-error";
import styles from "./RolesModule.module.css";

/* ——— Local UI types ——— */

interface PermissionGroupUI {
  id: PermissionGroup;
  label: string;
  icon: Icon;
  permissions: Permission[];
}

interface RoleView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: Role["type"];
  is_default: boolean;
  scope: DataScope;
  permission_ids: string[];
  created_at: string;
  updated_at: string;
  users_count: number;
  icon: Icon;
  iconBg: string;
  iconColor: string;
  permissionSet: Set<string>;
}

/* ——— Scope definitions ——— */

const SCOPE_OPTIONS: { value: DataScope; title: string; description: string }[] = [
  {
    value: "self",
    title: "Somente próprios dados",
    description: "Vê apenas suas missões, métricas e informações pessoais",
  },
  {
    value: "team",
    title: "Time direto",
    description: "Inclui dados dos liderados diretos e métricas do time",
  },
  {
    value: "org",
    title: "Toda a organização",
    description: "Acessa dados de todos os times e métricas organizacionais",
  },
];

const SCOPE_BADGE_MAP: Record<DataScope, { label: string; color: "wine" | "orange" } | null> = {
  self: null,
  team: { label: "Time direto", color: "orange" },
  org: { label: "Organização", color: "wine" },
};

/* ——— Permission groups (UI metadata merged with API catalog) ——— */

const PERMISSION_GROUP_UI: { id: PermissionGroup; label: string; icon: Icon }[] = [
  { id: "people", label: "Pessoas", icon: Users },
  { id: "missions", label: "Missões e OKRs", icon: Target },
  { id: "surveys", label: "Pesquisas", icon: ClipboardText },
  { id: "settings", label: "Configurações", icon: Gear },
  { id: "assistant", label: "Assistente de IA", icon: Lightning },
];

function buildPermissionGroups(permissions: Permission[]): PermissionGroupUI[] {
  return PERMISSION_GROUP_UI.map((group) => ({
    ...group,
    permissions: permissions.filter((permission) => permission.group === group.id),
  }));
}

function getRoleVisual(role: Pick<RoleView, "slug" | "type">): Pick<RoleView, "icon" | "iconBg" | "iconColor"> {
  switch (role.slug) {
    case "super-admin":
      return { icon: Crown, iconBg: "var(--color-orange-100)", iconColor: "var(--color-orange-700)" };
    case "admin-rh":
      return { icon: ShieldCheck, iconBg: "var(--color-wine-100)", iconColor: "var(--color-wine-700)" };
    case "gestor":
      return { icon: Users, iconBg: "var(--color-green-100)", iconColor: "var(--color-green-700)" };
    case "colaborador":
      return { icon: UserCircle, iconBg: "var(--color-caramel-100)", iconColor: "var(--color-caramel-700)" };
    case "visualizador":
      return { icon: Eye, iconBg: "var(--color-neutral-100)", iconColor: "var(--color-neutral-700)" };
    default:
      return role.type === "system"
        ? { icon: ShieldCheck, iconBg: "var(--color-neutral-100)", iconColor: "var(--color-neutral-700)" }
        : { icon: UserCircle, iconBg: "var(--color-orange-100)", iconColor: "var(--color-orange-700)" };
  }
}

/* ——— Scope section sub-component ——— */

function ScopeSection({
  value,
  disabled,
  onChange,
}: {
  value: DataScope;
  disabled: boolean;
  onChange: (scope: DataScope) => void;
}) {
  return (
    <div className={styles.scopeSection}>
      <div className={styles.scopeHeader}>
        <Binoculars size={20} />
        <div className={styles.scopeHeaderText}>
          <span className={styles.scopeTitle}>Escopo de dados</span>
          <span className={styles.scopeSubtitle}>
            Define de quem o usuário pode ver dados na plataforma
          </span>
        </div>
      </div>
      <ChoiceBoxGroup
        value={value}
        onChange={(v: string | undefined) => { if (v) onChange(v as DataScope); }}
        disabled={disabled}
      >
        {SCOPE_OPTIONS.map((opt) => (
          <ChoiceBox
            key={opt.value}
            value={opt.value}
            title={opt.title}
            description={opt.description}
          />
        ))}
      </ChoiceBoxGroup>
    </div>
  );
}

/* ——— Permission accordion sub-component ——— */

function PermissionAccordion({
  permissionSet,
  readOnly,
  groups,
  onTogglePermission,
  onToggleGroup,
}: {
  permissionSet: Set<string>;
  readOnly: boolean;
  groups: PermissionGroupUI[];
  onTogglePermission: (id: string) => void;
  onToggleGroup: (groupId: string) => void;
}) {
  return (
    <Accordion>
      {groups.map((group) => {
        const GroupIcon = group.icon;
        const checkedCount = group.permissions.filter((p) => permissionSet.has(p.id)).length;
        const allChecked = checkedCount === group.permissions.length;

        return (
          <AccordionItem
            key={group.id}
            icon={GroupIcon}
            title={group.label}
            defaultOpen
            action={
              <Badge
                color={allChecked ? "success" : checkedCount > 0 ? "orange" : "neutral"}
                size="sm"
              >
                {checkedCount}/{group.permissions.length}
              </Badge>
            }
          >
            <div className={styles.permGroupContent}>
              {!readOnly && (
                <label className={styles.selectAll}>
                  <Checkbox
                    checked={allChecked}
                    indeterminate={checkedCount > 0 && !allChecked}
                    onChange={() => onToggleGroup(group.id)}
                  />
                  <span className={styles.selectAllLabel}>
                    {allChecked ? "Desmarcar todas" : "Selecionar todas"}
                  </span>
                </label>
              )}
              <div className={styles.permList}>
                {group.permissions.map((perm) => (
                  <label key={perm.id} className={styles.permItem}>
                    <Checkbox
                      checked={permissionSet.has(perm.id)}
                      onChange={() => onTogglePermission(perm.id)}
                      disabled={readOnly}
                    />
                    <div className={styles.permItemText}>
                      <span className={styles.permItemLabel}>{perm.label}</span>
                      <span className={styles.permItemDesc}>{perm.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

/* ——— Component ——— */

export function RolesModule() {
  const { data: apiRoles = [], isLoading: rolesLoading, error: rolesError } = useRoles();
  const { data: permissions = [] } = usePermissions();

  const [editingRole, setEditingRole] = useState<RoleView | null>(null);
  const [search, setSearch] = useState("");

  const permissionGroups = useMemo(() => buildPermissionGroups(permissions), [permissions]);
  const allPermissionIds = useMemo(() => permissions.map((p) => p.id), [permissions]);
  const totalPermissions = allPermissionIds.length;

  const roles = useMemo<RoleView[]>(() => {
    return apiRoles.map((role) => {
      const roleView = {
        id: role.id,
        slug: role.slug,
        name: role.name,
        description: role.description ?? null,
        type: role.type,
        is_default: role.is_default,
        scope: role.scope,
        permission_ids: role.permission_ids,
        created_at: role.created_at,
        updated_at: role.updated_at,
        users_count: role.users_count,
      };
      const visual = getRoleVisual(roleView);
      return {
        ...roleView,
        ...visual,
        permissionSet: new Set(roleView.permission_ids),
      };
    });
  }, [apiRoles]);

  const filtered = useMemo(() => {
    if (!search) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q),
    );
  }, [roles, search]);

  function getPermPercent(role: RoleView): number {
    if (totalPermissions === 0) return 0;
    const knownCount = [...role.permissionSet].filter((permissionId) => allPermissionIds.includes(permissionId)).length;
    return Math.round((knownCount / totalPermissions) * 100);
  }

  function handleTogglePermission(permId: string) {
    setEditingRole((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.permissionSet);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return { ...prev, permissionSet: next };
    });
  }

  function handleToggleGroup(groupId: string) {
    const group = permissionGroups.find((g) => g.id === groupId);
    if (!group) return;
    setEditingRole((prev) => {
      if (!prev) return prev;
      const allChecked = group.permissions.every((permission) => prev.permissionSet.has(permission.id));
      const next = new Set(prev.permissionSet);
      group.permissions.forEach((p) => {
        if (allChecked) next.delete(p.id);
        else next.add(p.id);
      });
      return { ...prev, permissionSet: next };
    });
  }

  function handleScopeChange(scope: DataScope) {
    setEditingRole((prev) => {
      if (!prev) return prev;
      return { ...prev, scope };
    });
  }

  function handleCreateClick() {
    toast("Criar tipos customizados estará disponível em breve.");
  }

  return (
    <>
      <Card padding="none">
        <CardBody>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Input
                placeholder="Buscar tipo de usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={MagnifyingGlass}
              />
            </div>
            <Button variant="primary" size="md" leftIcon={Plus} onClick={handleCreateClick}>
              Novo tipo
            </Button>
          </div>

          {/* Role cards grid */}
          {rolesError ? (
            <Alert variant="error" title="Não foi possível carregar os tipos de usuário">
              {apiErrorToMessage(rolesError)}
            </Alert>
          ) : rolesLoading && filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <ShieldCheck size={32} />
              <p className={styles.emptyTitle}>Carregando tipos de usuário…</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className={styles.grid}>
              {filtered.map((role) => {
                const Icon = role.icon;
                const permPercent = getPermPercent(role);
                const isSystem = role.type === "system";
                const scopeBadge = SCOPE_BADGE_MAP[role.scope];

                return (
                  <div key={role.id} className={styles.roleCard}>
                    {/* Header */}
                    <div className={styles.roleCardHeader}>
                      <div
                        className={styles.roleIcon}
                        style={{ backgroundColor: role.iconBg, color: role.iconColor }}
                      >
                        <Icon size={24} />
                      </div>
                      <div className={styles.roleCardBadges}>
                        {scopeBadge && (
                          <Badge color={scopeBadge.color} size="sm">{scopeBadge.label}</Badge>
                        )}
                        {isSystem ? (
                          <Badge color="neutral" size="sm" leftIcon={Lock}>Sistema</Badge>
                        ) : (
                          <Badge color="orange" size="sm">Customizado</Badge>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className={styles.roleCardInfo}>
                      <h4 className={styles.roleCardName}>
                        {role.name}
                        {role.is_default && (
                          <Badge color="success" size="sm">Padrão</Badge>
                        )}
                      </h4>
                      <p className={styles.roleCardDesc}>{role.description}</p>
                    </div>

                    {/* Stats */}
                    <div className={styles.roleCardStats}>
                      <div className={styles.statItem}>
                        <Users size={14} />
                        <span>{role.users_count} {role.users_count === 1 ? "usuário" : "usuários"}</span>
                      </div>
                      <div className={styles.statItem}>
                        <ShieldCheck size={14} />
                        <span>{role.permissionSet.size}/{totalPermissions} permissões</span>
                      </div>
                    </div>

                    {/* Permission bar */}
                    <div className={styles.permBar}>
                      <div className={styles.permBarTrack}>
                        <div
                          className={styles.permBarFill}
                          style={{ width: `${permPercent}%` }}
                        />
                      </div>
                      <span className={styles.permBarLabel}>{permPercent}%</span>
                    </div>

                    {/* Actions */}
                    <div className={styles.roleCardActions}>
                      <Button
                        variant="secondary"
                        size="md"
                        leftIcon={Eye}
                        onClick={() => setEditingRole(role)}
                      >
                        Ver permissões
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <ShieldCheck size={32} />
              <p className={styles.emptyTitle}>Nenhum tipo de usuário encontrado</p>
              <p className={styles.emptyDesc}>Tente ajustar a busca ou crie um novo tipo.</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Permission editing modal */}
      <Modal open={!!editingRole} onClose={() => setEditingRole(null)} size="lg">
        {editingRole && (() => {
          const Icon = editingRole.icon;
          const isSystem = editingRole.type === "system";
          return (
            <>
              <ModalHeader
                title={`Permissões de ${editingRole.name}`}
                onClose={() => setEditingRole(null)}
              />
              <ModalBody>
                <div className={styles.editContent}>
                  {/* Role summary */}
                  <div className={styles.editSummary}>
                    <div
                      className={styles.editIcon}
                      style={{ backgroundColor: editingRole.iconBg, color: editingRole.iconColor }}
                    >
                      <Icon size={24} />
                    </div>
                    <div className={styles.editInfo}>
                      <p className={styles.editDesc}>{editingRole.description}</p>
                      <div className={styles.editMeta}>
                        <Badge color={isSystem ? "neutral" : "orange"} size="sm">
                          {isSystem ? "Sistema" : "Customizado"}
                        </Badge>
                        <span className={styles.editMetaText}>
                          {editingRole.users_count} {editingRole.users_count === 1 ? "usuário" : "usuários"} · {editingRole.permissionSet.size}/{totalPermissions} permissões
                        </span>
                      </div>
                    </div>
                  </div>

                  <Alert
                    variant="warning"
                    title="Tipo de usuário somente leitura"
                  >
                    A edição de tipos e permissões estará disponível quando os endpoints de escrita forem ativados.
                  </Alert>

                  {/* Scope selector */}
                  <ScopeSection
                    value={editingRole.scope}
                    disabled
                    onChange={handleScopeChange}
                  />

                  {/* Feature permissions header */}
                  <div className={styles.featureHeader}>
                    <ShieldCheck size={20} />
                    <div className={styles.scopeHeaderText}>
                      <span className={styles.scopeTitle}>Permissões de ação</span>
                      <span className={styles.scopeSubtitle}>
                        Define o que o usuário pode fazer dentro de cada módulo
                      </span>
                    </div>
                  </div>

                  {/* Feature permission groups */}
                  <PermissionAccordion
                    permissionSet={editingRole.permissionSet}
                    readOnly
                    groups={permissionGroups}
                    onTogglePermission={handleTogglePermission}
                    onToggleGroup={handleToggleGroup}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="tertiary" size="md" onClick={() => setEditingRole(null)}>
                  Fechar
                </Button>
              </ModalFooter>
            </>
          );
        })()}
      </Modal>
    </>
  );
}
