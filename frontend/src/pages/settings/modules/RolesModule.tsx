import { useState, useMemo } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Badge,
  Checkbox,
  ChoiceBox,
  ChoiceBoxGroup,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  Alert,
  Accordion,
  AccordionItem,
  Breadcrumb,
  toast,
} from "@getbud-co/buds";
import type { BreadcrumbItem } from "@getbud-co/buds";
import {
  Plus,
  Trash,
  Crown,
  Users,
  UserCircle,
  Eye,
  ShieldCheck,
  PencilSimple,
  Lock,
  MagnifyingGlass,
  Target,
  ClipboardText,
  Gear,
  Binoculars,
  Lightning,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { Permission, PermissionGroup, DataScope } from "@/types";
import { useConfigData } from "@/contexts/ConfigDataContext";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import type { ConfigRoleRecord } from "@/lib/config-store";
import styles from "./RolesModule.module.css";

/* ——— Local UI types ——— */

interface PermissionGroupUI {
  id: PermissionGroup;
  label: string;
  icon: Icon;
  permissions: Permission[];
}

interface RoleView extends ConfigRoleRecord {
  icon: Icon;
  iconBg: string;
  iconColor: string;
  usersCount: number;
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

/* ——— Permission groups ——— */

const PERMISSION_GROUPS: PermissionGroupUI[] = [
  {
    id: "people",
    label: "Pessoas",
    icon: Users,
    permissions: [
      { id: "people.view", group: "people", label: "Visualizar", description: "Ver informações de colaboradores" },
      { id: "people.create", group: "people", label: "Criar", description: "Adicionar novos colaboradores" },
      { id: "people.edit", group: "people", label: "Editar", description: "Alterar dados de colaboradores" },
      { id: "people.deactivate", group: "people", label: "Desativar", description: "Desativar contas de colaboradores" },
    ],
  },
  {
    id: "missions",
    label: "Missões e OKRs",
    icon: Target,
    permissions: [
      { id: "missions.view", group: "missions", label: "Visualizar", description: "Ver missões e OKRs" },
      { id: "missions.create", group: "missions", label: "Criar", description: "Criar novas missões e OKRs" },
      { id: "missions.edit", group: "missions", label: "Editar", description: "Alterar missões e OKRs existentes" },
      { id: "missions.delete", group: "missions", label: "Excluir", description: "Remover missões e OKRs" },
      { id: "missions.assign", group: "missions", label: "Atribuir", description: "Atribuir missões a colaboradores" },
    ],
  },
  {
    id: "surveys",
    label: "Pesquisas",
    icon: ClipboardText,
    permissions: [
      { id: "surveys.view", group: "surveys", label: "Visualizar", description: "Ver pesquisas disponíveis" },
      { id: "surveys.create", group: "surveys", label: "Criar", description: "Criar novas pesquisas" },
      { id: "surveys.edit", group: "surveys", label: "Editar", description: "Alterar pesquisas existentes" },
      { id: "surveys.publish", group: "surveys", label: "Publicar", description: "Publicar pesquisas para respondentes" },
      { id: "surveys.results", group: "surveys", label: "Ver resultados", description: "Acessar resultados e análises" },
    ],
  },
  {
    id: "settings",
    label: "Configurações",
    icon: Gear,
    permissions: [
      { id: "settings.access", group: "settings", label: "Acessar", description: "Visualizar configurações da plataforma" },
      { id: "settings.edit", group: "settings", label: "Editar", description: "Alterar configurações da plataforma" },
    ],
  },
  {
    id: "assistant",
    label: "Assistente de IA",
    icon: Lightning,
    permissions: [
      { id: "assistant.tone", group: "assistant", label: "Tom de voz", description: "Escolher e criar tons de voz personalizados" },
      { id: "assistant.language", group: "assistant", label: "Idioma", description: "Alterar idioma do assistente" },
      { id: "assistant.suggestions", group: "assistant", label: "Sugestões", description: "Configurar nível de proatividade e tipos de sugestão" },
      { id: "assistant.transparency", group: "assistant", label: "Transparência", description: "Configurar modo de explicação da IA" },
      { id: "assistant.llm", group: "assistant", label: "LLM própria", description: "Conectar provedores de IA pessoais" },
    ],
  },
];

const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.id));
const TOTAL_PERMISSIONS = ALL_PERMISSION_IDS.length;

function getRoleVisual(role: ConfigRoleRecord): Pick<RoleView, "icon" | "iconBg" | "iconColor"> {
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

const CREATE_STEPS: BreadcrumbItem[] = [
  { label: "Informações básicas" },
  { label: "Configurar permissões" },
];

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
  isSystem,
  onTogglePermission,
  onToggleGroup,
}: {
  permissionSet: Set<string>;
  isSystem: boolean;
  onTogglePermission: (id: string) => void;
  onToggleGroup: (groupId: string) => void;
}) {
  return (
    <Accordion>
      {PERMISSION_GROUPS.map((group) => {
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
              {!isSystem && (
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
                      disabled={isSystem}
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
  const {
    roles: configRoles,
    createRole,
    updateRole,
    deleteRole: removeRole,
    resolveRoleSlug,
  } = useConfigData();
  const { users } = usePeopleData();

  const [editingRole, setEditingRole] = useState<RoleView | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [deletingRole, setDeletingRole] = useState<RoleView | null>(null);
  const [search, setSearch] = useState("");

  /* create form */
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTemplate, setFormTemplate] = useState("");
  const [formScope, setFormScope] = useState<DataScope>("self");
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());

  const usersCountByRoleSlug = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((user) => {
      const slug = resolveRoleSlug(user.roleType);
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    });
    return counts;
  }, [users, resolveRoleSlug]);

  const roles = useMemo<RoleView[]>(() => {
    return configRoles.map((role) => {
      const visual = getRoleVisual(role);
      return {
        ...role,
        ...visual,
        usersCount: usersCountByRoleSlug.get(role.slug) ?? 0,
        permissionSet: new Set(role.permissionIds ?? []),
      };
    });
  }, [configRoles, usersCountByRoleSlug]);

  const filtered = useMemo(() => {
    if (!search) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q),
    );
  }, [roles, search]);

  function getPermPercent(role: RoleView): number {
    const knownCount = [...role.permissionSet].filter((permissionId) => ALL_PERMISSION_IDS.includes(permissionId)).length;
    return Math.round((knownCount / TOTAL_PERMISSIONS) * 100);
  }

  function handleTogglePermission(permId: string) {
    setEditingRole((prev) => {
      if (!prev || prev.type === "system") return prev;
      const next = new Set(prev.permissionSet);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return { ...prev, permissionSet: next };
    });
  }

  function handleToggleGroup(groupId: string) {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    setEditingRole((prev) => {
      if (!prev || prev.type === "system") return prev;
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
      if (!prev || prev.type === "system") return prev;
      return { ...prev, scope };
    });
  }

  /* ——— Create helpers ——— */

  function openCreateModal() {
    setFormName("");
    setFormDesc("");
    setFormTemplate("");
    setFormScope("self");
    setFormPermissions(new Set());
    setCreateStep(0);
    setCreateOpen(true);
  }

  function handleContinueToPermissions() {
    const template = formTemplate ? roles.find((r) => r.id === formTemplate) : null;
    if (template) {
      setFormPermissions(new Set(template.permissionSet));
      setFormScope(template.scope);
    }
    setCreateStep(1);
  }

  function handleCreateTogglePermission(permId: string) {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  function handleCreateToggleGroup(groupId: string) {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const allChecked = group.permissions.every((p) => formPermissions.has(p.id));
    setFormPermissions((prev) => {
      const next = new Set(prev);
      group.permissions.forEach((p) => {
        if (allChecked) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  }

  function handleCreate() {
    createRole({
      name: formName.trim(),
      description: formDesc.trim() || null,
      type: "custom",
      scope: formScope,
      permissionIds: Array.from(formPermissions),
    });
    setCreateOpen(false);
    toast.success("Tipo de usuário criado");
  }

  function handleDelete() {
    if (!deletingRole) return;
    const deleted = removeRole(deletingRole.id);
    if (!deleted) {
      toast.error("Não foi possível excluir este tipo de usuário");
      return;
    }
    if (editingRole?.id === deletingRole.id) setEditingRole(null);
    setDeletingRole(null);
    toast.success("Tipo de usuário excluído");
  }

  function handleSavePermissions() {
    if (!editingRole) return;
    if (editingRole.type !== "system") {
      const updated = updateRole(editingRole.id, {
        scope: editingRole.scope,
        permissionIds: Array.from(editingRole.permissionSet),
      });
      if (!updated) {
        toast.error("Não foi possível atualizar este tipo de usuário");
        return;
      }
    }
    setEditingRole(null);
    toast.success("Permissões atualizadas");
  }

  const TEMPLATE_OPTIONS = [
    { value: "", label: "Começar do zero" },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

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
            <Button variant="primary" size="md" leftIcon={Plus} onClick={openCreateModal}>
              Novo tipo
            </Button>
          </div>

          {/* Role cards grid */}
          {filtered.length > 0 ? (
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
                        {role.isDefault && (
                          <Badge color="success" size="sm">Padrão</Badge>
                        )}
                      </h4>
                      <p className={styles.roleCardDesc}>{role.description}</p>
                    </div>

                    {/* Stats */}
                    <div className={styles.roleCardStats}>
                      <div className={styles.statItem}>
                        <Users size={14} />
                        <span>{role.usersCount} {role.usersCount === 1 ? "usuário" : "usuários"}</span>
                      </div>
                      <div className={styles.statItem}>
                        <ShieldCheck size={14} />
                        <span>{role.permissionSet.size}/{TOTAL_PERMISSIONS} permissões</span>
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
                        variant={isSystem ? "secondary" : "primary"}
                        size="md"
                        leftIcon={isSystem ? Eye : PencilSimple}
                        onClick={() => setEditingRole(role)}
                      >
                        {isSystem ? "Ver permissões" : "Editar permissões"}
                      </Button>
                      {!isSystem && (
                        <Button
                          variant="tertiary"
                          size="md"
                          leftIcon={Trash}
                          onClick={() => setDeletingRole(role)}
                        />
                      )}
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
                title={`${isSystem ? "Permissões de" : "Editar permissões de"} ${editingRole.name}`}
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
                          {editingRole.usersCount} {editingRole.usersCount === 1 ? "usuário" : "usuários"} · {editingRole.permissionSet.size}/{TOTAL_PERMISSIONS} permissões
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSystem && (
                    <Alert
                      variant="warning"
                      title="Tipo de usuário do sistema"
                    >
                      Este tipo não pode ser editado. Duplique-o para criar uma versão personalizada com permissões ajustáveis.
                    </Alert>
                  )}

                  {/* Scope selector */}
                  <ScopeSection
                    value={editingRole.scope}
                    disabled={isSystem}
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
                    isSystem={isSystem}
                    onTogglePermission={handleTogglePermission}
                    onToggleGroup={handleToggleGroup}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="tertiary" size="md" onClick={() => setEditingRole(null)}>
                  {isSystem ? "Fechar" : "Cancelar"}
                </Button>
                {!isSystem && (
                  <Button variant="primary" size="md" onClick={handleSavePermissions}>
                    Salvar permissões
                  </Button>
                )}
              </ModalFooter>
            </>
          );
        })()}
      </Modal>

      {/* Create modal (2-step) */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} size="lg">
        <ModalHeader title="Novo tipo de usuário" onClose={() => setCreateOpen(false)} />
        <Breadcrumb
          items={CREATE_STEPS.map((step, i) => ({
            ...step,
            onClick: i < createStep ? () => setCreateStep(i) : undefined,
          }))}
          current={createStep}
        />
        <ModalBody>
          {createStep === 0 && (
            <div className={styles.formStack}>
              <Input
                label="Nome"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Líder de projeto"
              />
              <Textarea
                label="Descrição"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Descreva as responsabilidades e o nível de acesso..."
                rows={3}
              />
              <Select
                label="Copiar permissões de (opcional)"
                value={formTemplate}
                onChange={setFormTemplate}
                options={TEMPLATE_OPTIONS}
              />
            </div>
          )}

          {createStep === 1 && (
            <div className={styles.editContent}>
              {/* Scope selector */}
              <ScopeSection
                value={formScope}
                disabled={false}
                onChange={setFormScope}
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

              {/* Feature permissions */}
              <PermissionAccordion
                permissionSet={formPermissions}
                isSystem={false}
                onTogglePermission={handleCreateTogglePermission}
                onToggleGroup={handleCreateToggleGroup}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {createStep === 0 ? (
            <>
              <Button variant="tertiary" size="md" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!formName.trim()}
                onClick={handleContinueToPermissions}
              >
                Continuar
              </Button>
            </>
          ) : (
            <>
              <Button variant="tertiary" size="md" onClick={() => setCreateStep(0)}>
                Voltar
              </Button>
              <Button variant="primary" size="md" onClick={handleCreate}>
                Criar tipo
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deletingRole} onClose={() => setDeletingRole(null)} size="sm">
        <ModalHeader title="Excluir tipo de usuário" onClose={() => setDeletingRole(null)} />
        <ModalBody>
          {deletingRole && (
            <div className={styles.deleteContent}>
              <p className={styles.confirmText}>
                Tem certeza que deseja excluir <strong>{deletingRole.name}</strong>?
              </p>
              {deletingRole.usersCount > 0 && (
                <Alert variant="warning" title={`${deletingRole.usersCount} usuários serão afetados`}>
                  Os usuários com este tipo precisarão ser reatribuídos a outro tipo após a exclusão.
                </Alert>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeletingRole(null)}>
            Cancelar
          </Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleDelete}>
            Excluir tipo
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
