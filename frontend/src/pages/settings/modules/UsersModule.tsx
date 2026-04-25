import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Table,
  TableCardHeader,
  TableContent,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableBulkActions,
  Button,
  Input,
  Badge,
  Alert,
  AvatarLabelGroup,
  FilterBar,
  FilterChip,
  FilterDropdown,
  Radio,
  toast,
  RowActionsPopover,
} from "@getbud-co/buds";
import type { PopoverItem } from "@getbud-co/buds";
import {
  MagnifyingGlass,
  Plus,
  PencilSimple,
  Key,
  UserMinus,
  UserCheck,
  CaretDown,
  UploadSimple,
  Trash,
} from "@phosphor-icons/react";
import type { UserStatus, Gender } from "@/types";
import type { PeopleUserView } from "@/contexts/PeopleDataContext";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUpdateMembership, type User } from "@/hooks/use-users";
import { useRoles } from "@/hooks/use-roles";
import { useTeams } from "@/hooks/use-teams";
import { apiErrorToMessage } from "@/lib/api-error";
import { useAuth } from "@/contexts/AuthContext";
import { useUserForm } from "./hooks/useUserForm";
import { useUsersTable } from "./hooks/useUsersTable";
import { UserInviteModal } from "./components/UserInviteModal";
import { UserEditModal } from "./components/UserEditModal";
import { UserImportModal } from "./components/UserImportModal";
import { ConfirmModal } from "./components/ConfirmModal";
import styles from "./UsersModule.module.css";

type UserView = PeopleUserView;
type RoleSlug = "super-admin" | "admin-rh" | "gestor" | "colaborador" | "visualizador";

const STATUS_BADGE: Record<UserStatus, { label: string; color: "success" | "neutral" | "warning" | "error" }> = {
  active: { label: "Ativo", color: "success" },
  inactive: { label: "Inativo", color: "neutral" },
  invited: { label: "Convidado", color: "warning" },
  suspended: { label: "Suspenso", color: "error" },
};

const DEFAULT_ROLE_SLUG = "colaborador";

function createViewRoleId(orgId: string, roleSlug: string): string {
  return `role-${orgId}-${roleSlug}`;
}

function apiUserToView(u: User, orgId: string, teamNameById?: Map<string, string>): PeopleUserView {
  const roleType = u.role ?? "colaborador";
  const teamNames = (u.team_ids ?? []).map((id) => teamNameById?.get(id) ?? id);
  return {
    id: u.id,
    orgId,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    nickname: u.nickname ?? null,
    jobTitle: u.job_title ?? null,
    managerId: null,
    avatarUrl: null,
    initials: `${u.first_name[0] ?? ""}${u.last_name[0] ?? ""}`.toUpperCase(),
    birthDate: u.birth_date ?? null,
    gender: (u.gender as Gender) ?? null,
    language: u.language,
    phone: u.phone ?? null,
    status: (u.membership_status ?? u.status) as UserStatus,
    invitedAt: null,
    activatedAt: null,
    lastLoginAt: null,
    authProvider: "email",
    authProviderId: null,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    deletedAt: null,
    roleId: createViewRoleId(orgId, roleType),
    roleType,
    teams: teamNames,
  };
}

export function UsersModule() {
  const { activeOrganization } = useAuth();
  const apiOrgId = activeOrganization?.id ?? "org-1";

  // --- Data fetching via hooks ---
  const { data: rolesData } = useRoles();
  const apiRoles = useMemo(() => rolesData ?? [], [rolesData]);

  const teamsQuery = useTeams();
  const teamsData = teamsQuery.data;
  const apiTeams = useMemo(
    () => (teamsData ?? []).map((t) => ({ id: t.id, name: t.name })),
    [teamsData],
  );

  const usersQuery = useUsers();
  const usersData = usersQuery.data;

  // --- Mutations ---
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const updateMembershipMutation = useUpdateMembership();

  // --- UI state ---
  const [inviteOpen, setInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deactivateUser, setDeactivateUser] = useState<UserView | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserView | null>(null);
  const [editUser, setEditUser] = useState<UserView | null>(null);

  const defaultInviteRole = useMemo(
    () =>
      apiRoles.find((role) => role.is_default)?.slug ??
      apiRoles.find((role) => role.slug === DEFAULT_ROLE_SLUG)?.slug ??
      apiRoles[0]?.slug ??
      DEFAULT_ROLE_SLUG,
    [apiRoles],
  );

  const inviteForm = useUserForm(defaultInviteRole);
  const editForm = useUserForm(defaultInviteRole);
  const inviteRole = inviteForm.role;
  const setInviteRole = inviteForm.setRole;
  const previousDefaultInviteRoleRef = useRef(defaultInviteRole);

  const roleSelectionOptions = useMemo(
    () => {
      const roles = apiRoles.length > 0
        ? apiRoles
        : [{
            slug: DEFAULT_ROLE_SLUG,
            name: "Colaborador",
            description: "Sem descrição",
          }];
      return roles.map((role) => ({
        value: role.slug,
        label: role.name,
        description: role.description ?? "Sem descrição",
      }));
    },
    [apiRoles],
  );

  const roleSlugs = useMemo(
    () => new Set(roleSelectionOptions.map((role) => role.value)),
    [roleSelectionOptions],
  );

  const resolveRoleSlug = useCallback(
    (legacyOrCanonical: string) => {
      if (roleSlugs.has(legacyOrCanonical)) return legacyOrCanonical;
      const aliases: Record<string, string> = {
        admin: "super-admin",
        manager: "gestor",
        collaborator: DEFAULT_ROLE_SLUG,
      };
      const alias = aliases[legacyOrCanonical];
      if (alias && roleSlugs.has(alias)) return alias;
      return legacyOrCanonical;
    },
    [roleSlugs],
  );

  const teamNameById = useMemo(
    () => new Map(apiTeams.map((t) => [t.id, t.name])),
    [apiTeams],
  );

  const teamIdByName = useMemo(
    () => new Map(apiTeams.map((t) => [t.name, t.id])),
    [apiTeams],
  );

  const inviteTeamOptions = useMemo(
    () => apiTeams.map((t) => ({ value: t.id, label: t.name })),
    [apiTeams],
  );

  useEffect(() => {
    const previousDefaultInviteRole = previousDefaultInviteRoleRef.current;
    if (previousDefaultInviteRole === defaultInviteRole) return;
    previousDefaultInviteRoleRef.current = defaultInviteRole;
    if (inviteRole === previousDefaultInviteRole) {
      setInviteRole(defaultInviteRole);
    }
  }, [defaultInviteRole, inviteRole, setInviteRole]);

  const roleFilterOptions = useMemo(
    () => ([
      { id: "all", label: "Todos os tipos" },
      ...roleSelectionOptions.map((role) => ({ id: role.value, label: role.label })),
    ]),
    [roleSelectionOptions],
  );

  const roleLabelBySlug = useMemo(
    () => new Map(roleSelectionOptions.map((role) => [role.value, role.label])),
    [roleSelectionOptions],
  );

  const roleSelectOptions = useMemo(
    () => roleSelectionOptions.map((role) => ({ value: role.value, label: role.label })),
    [roleSelectionOptions],
  );

  // --- Derive pageUsers from query data ---
  const pageUsers = useMemo(() => {
    if (!usersData) return [];
    return usersData.map((u) => apiUserToView(u, apiOrgId, teamNameById));
  }, [usersData, apiOrgId, teamNameById]);

  const table = useUsersTable(pageUsers, resolveRoleSlug);

  const [rolePopoverUser, setRolePopoverUser] = useState<string | null>(null);
  const rolePopoverRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [actionsPopoverUser, setActionsPopoverUser] = useState<string | null>(null);

  async function handleInvite() {
    setInviteLoading(true);
    try {
      await createUserMutation.mutateAsync({
        first_name: inviteForm.firstName,
        last_name: inviteForm.lastName,
        email: inviteForm.email,
        password: crypto.randomUUID(),
        role: resolveRoleSlug(inviteForm.role) as RoleSlug,
        nickname: inviteForm.nickname || undefined,
        job_title: inviteForm.jobTitle || undefined,
        birth_date: inviteForm.getBirthDateString(),
        language: inviteForm.language,
        gender: (inviteForm.gender as "feminino" | "masculino" | "nao-binario" | "prefiro-nao-dizer") || undefined,
        team_ids: inviteForm.teams.length > 0 ? inviteForm.teams : undefined,
      });
      setInviteOpen(false);
      inviteForm.reset();
      toast.success("Convite enviado com sucesso");
    } catch (err) {
      toast.error(apiErrorToMessage(err, { 409: "Conflito: este usuário já existe na organização." }));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleBulkToggleStatus() {
    const newStatus = table.allSelectedInactive ? "active" as const : "inactive" as const;
    const targets = pageUsers.filter((u) => table.selectedRows.has(u.id) && u.status !== "invited");
    const results = await Promise.allSettled(
      targets.map((u) => updateUserMutation.mutateAsync({
        id: u.id,
        body: {
          first_name: u.firstName,
          last_name: u.lastName,
          email: u.email,
          status: newStatus,
          nickname: u.nickname ?? undefined,
          job_title: u.jobTitle ?? undefined,
          birth_date: u.birthDate ?? undefined,
          language: u.language,
          gender: (u.gender as "feminino" | "masculino" | "nao-binario" | "prefiro-nao-dizer") ?? undefined,
          phone: u.phone ?? undefined,
        },
      })),
    );
    const succeeded = new Set(targets.filter((_, i) => results[i]?.status === "fulfilled").map((u) => u.id));
    const failCount = results.filter((r) => r.status === "rejected").length;
    table.clearSelection();
    if (failCount > 0) toast.error(`${failCount} operação(ões) falharam`);
    else toast.success(newStatus === "active" ? `${succeeded.size} usuário(s) ativado(s)` : `${succeeded.size} usuário(s) desativado(s)`);
  }

  async function handleBulkDelete() {
    const targets = [...table.selectedRows];
    const results = await Promise.allSettled(targets.map((id) => deleteUserMutation.mutateAsync(id)));
    const succeeded = new Set(targets.filter((_, i) => results[i]?.status === "fulfilled"));
    const failCount = results.filter((r) => r.status === "rejected").length;
    table.clearSelection();
    if (failCount > 0) toast.error(`${failCount} remoção(ões) falharam`);
    else toast.success(`${succeeded.size} usuário(s) removido(s)`);
  }

  async function handleToggleStatus() {
    if (!deactivateUser) return;
    if (deactivateUser.status === "invited") {
      toast.warning("Usuários convidados não podem ser desativados");
      setDeactivateUser(null);
      return;
    }
    const newStatus = deactivateUser.status === "active" ? "inactive" as const : "active" as const;
    try {
      await updateUserMutation.mutateAsync({
        id: deactivateUser.id,
        body: {
          first_name: deactivateUser.firstName,
          last_name: deactivateUser.lastName,
          email: deactivateUser.email,
          status: newStatus,
          nickname: deactivateUser.nickname ?? undefined,
          job_title: deactivateUser.jobTitle ?? undefined,
          birth_date: deactivateUser.birthDate ?? undefined,
          language: deactivateUser.language,
          gender: (deactivateUser.gender as "feminino" | "masculino" | "nao-binario" | "prefiro-nao-dizer") ?? undefined,
          phone: deactivateUser.phone ?? undefined,
        },
      });
      setDeactivateUser(null);
      toast.success(newStatus === "active" ? "Usuário ativado" : "Usuário desativado");
    } catch (err) {
      toast.error(apiErrorToMessage(err, { 409: "Conflito: este usuário já existe na organização." }));
    }
  }

  function handleResetPassword() {
    if (!resetPasswordUser) return;
    setResetPasswordUser(null);
    toast.success(`E-mail de redefinição enviado para ${resetPasswordUser.email}`);
  }

  function handleDownloadTemplate() {
    const headers = ["Nome", "Sobrenome", "Apelido", "E-mail", "Cargo", "Time", "Tipo de usuário", "Data de nascimento", "Idioma", "Gênero"];
    const exampleRow = ["Maria", "Soares", "Mari", "maria@empresa.com", "Product Manager", "Produto; Liderança", DEFAULT_ROLE_SLUG, "15/03/1990", "pt-br", "Feminino"];
    const hintsRow = [
      "", "", "", "", "",
      `Múltiplos times separados por ; — Valores: ${inviteTeamOptions.map((t) => t.value).join(" | ")}`,
      `Valores: ${roleSelectionOptions.map((r) => r.value).join(" | ")}`,
      "Formato: DD/MM/AAAA",
      `Valores: pt-br | en | es`,
      `Valores: Feminino | Masculino | Não-binário | Prefiro não dizer`,
    ];
    const escape = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = [headers, exampleRow, hintsRow].map((row) => row.map(escape).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-usuarios-bud.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    if (!importFile) return;
    toast.success(`Arquivo "${importFile.name}" enviado. Os usuários serão importados em breve.`);
    setImportOpen(false);
    setImportFile(null);
  }

  function openEditUser(user: UserView) {
    setEditUser(user);
    editForm.populateFromValues({
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      email: user.email,
      jobTitle: user.jobTitle,
      teams: user.teams.map((name) => teamIdByName.get(name) ?? name),
      role: resolveRoleSlug(user.roleType),
      birthDate: user.birthDate,
      language: user.language,
      gender: user.gender,
    });
  }

  async function handleEditSave() {
    if (!editUser) return;
    const userStatus = (editUser.status === "active" || editUser.status === "inactive") ? editUser.status : "active";
    try {
      await updateUserMutation.mutateAsync({
        id: editUser.id,
        body: {
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          email: editForm.email,
          status: userStatus,
          nickname: editForm.nickname || undefined,
          job_title: editForm.jobTitle || undefined,
          birth_date: editForm.getBirthDateString(),
          language: editForm.language,
          gender: (editForm.gender as "feminino" | "masculino" | "nao-binario" | "prefiro-nao-dizer") || undefined,
          team_ids: editForm.teams,
        },
      });
    } catch (err) {
      toast.error(apiErrorToMessage(err, { 409: "Conflito: este usuário já existe na organização." }));
      return;
    }
    const newRole = resolveRoleSlug(editForm.role);
    const currentRole = resolveRoleSlug(editUser.roleType);
    let roleUpdated = true;
    if (newRole !== currentRole) {
      const membershipStatus = editUser.status === "invited" ? "invited" as const : "active" as const;
      try {
        await updateMembershipMutation.mutateAsync({
          id: editUser.id,
          body: { role: newRole as RoleSlug, status: membershipStatus },
        });
      } catch {
        roleUpdated = false;
      }
    }
    if (!roleUpdated) {
      toast.warning("Perfil salvo, mas tipo de usuário não foi atualizado. Tente novamente.");
    } else {
      setEditUser(null);
      toast.success("Perfil atualizado com sucesso");
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const normalizedRole = resolveRoleSlug(newRole);
    const target = pageUsers.find((u) => u.id === userId);
    const membershipStatus = target?.status === "invited" ? "invited" as const : "active" as const;
    try {
      await updateMembershipMutation.mutateAsync({
        id: userId,
        body: { role: normalizedRole as RoleSlug, status: membershipStatus },
      });
      setRolePopoverUser(null);
      toast.success("Tipo de usuário atualizado");
    } catch (err) {
      toast.error(apiErrorToMessage(err, { 409: "Conflito: este usuário já existe na organização." }));
    }
  }

  function getRowActions(user: UserView): PopoverItem[] {
    const items: PopoverItem[] = [
      { id: "edit", label: "Editar usuário", icon: PencilSimple, onClick: () => openEditUser(user) },
      { id: "reset-password", label: "Redefinir senha", icon: Key, onClick: () => setResetPasswordUser(user) },
    ];
    if (user.status === "active") {
      items.push({ id: "deactivate", label: "Desativar usuário", icon: UserMinus, danger: true, onClick: () => setDeactivateUser(user) });
    } else {
      items.push({ id: "activate", label: "Ativar usuário", icon: UserCheck, onClick: () => setDeactivateUser(user) });
    }
    return items;
  }

  return (
    <>
      {usersQuery.isTruncated && (
        <Alert variant="warning" title="Lista de usuários parcial">
          Mostrando {usersData.length} de {usersQuery.total} usuários. A paginação completa ainda precisa ser implementada.
        </Alert>
      )}

      {teamsQuery.isTruncated && (
        <Alert variant="warning" title="Lista de times parcial">
          Mostrando {teamsData.length} de {teamsQuery.total} times. Alguns vínculos podem não aparecer até a paginação completa ser implementada.
        </Alert>
      )}

      <Table
        variant="divider"
        elevated={false}
        selectable
        selectedRows={table.selectedRows}
        rowIds={table.rowIds}
        onSelectRow={table.handleSelectRow}
        onSelectAll={(checked: boolean) => table.handleSelectAll(checked, table.rowIds)}
      >
        <TableCardHeader
          title="Usuários"
          badge={<Badge color="neutral">{table.filtered.length}</Badge>}
          actions={
            <div className={styles.headerActions}>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={table.search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => table.setSearch(e.target.value)}
                  leftIcon={MagnifyingGlass}
                />
              </div>
              <Button variant="secondary" size="md" leftIcon={UploadSimple} onClick={() => setImportOpen(true)}>
                Importar usuários
              </Button>
              <Button variant="primary" size="md" leftIcon={Plus} onClick={() => setInviteOpen(true)}>
                Convidar usuário
              </Button>
            </div>
          }
        />
        <div className={styles.toolbar}>
          <FilterBar
            filters={table.getAvailableFilters([{ id: "status", label: "Status" }, { id: "role", label: "Tipo de usuário" }])}
            onAddFilter={(id: string) => table.addFilterAndOpen(id)}
            onClearAll={table.activeFilters.length > 0 ? table.clearAllFilters : undefined}
          >
            {table.activeFilters.map((filterId: string) => (
              <div key={filterId} ref={table.chipRefs[filterId]} style={{ display: "inline-flex" }}>
                <FilterChip
                  label={table.getFilterLabel(filterId, roleFilterOptions)}
                  active={table.openFilter === filterId}
                  onClick={() => table.toggleFilterDropdown(filterId)}
                  onRemove={() => table.removeFilter(filterId)}
                />
              </div>
            ))}
          </FilterBar>
        </div>

        <FilterDropdown
          open={table.openFilter === "status"}
          onClose={() => table.setOpenFilter(null)}
          anchorRef={table.statusChipRef}
          ignoreRefs={table.ignoreChipRefs}
        >
          <div className={styles.filterDropdownBody}>
            {["all", "active", "inactive", "invited", "suspended"].map((id) => {
              const labels: Record<string, string> = { all: "Todos", active: "Ativo", inactive: "Inativo", invited: "Convidado", suspended: "Suspenso" };
              return (
                <button
                  key={id}
                  type="button"
                  className={`${styles.filterActionItem} ${table.filterStatus === id ? styles.filterActionItemActive : ""}`}
                  onClick={() => { table.setFilterStatus(id); table.setOpenFilter(null); }}
                >
                  <Radio checked={table.filterStatus === id} readOnly />
                  <span>{labels[id]}</span>
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        <FilterDropdown
          open={table.openFilter === "role"}
          onClose={() => table.setOpenFilter(null)}
          anchorRef={table.roleChipRef}
          ignoreRefs={table.ignoreChipRefs}
        >
          <div className={styles.filterDropdownBody}>
            {roleFilterOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`${styles.filterActionItem} ${table.filterRole === opt.id ? styles.filterActionItemActive : ""}`}
                onClick={() => { table.setFilterRole(opt.id); table.setOpenFilter(null); }}
              >
                <Radio checked={table.filterRole === opt.id} readOnly />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </FilterDropdown>

        <TableContent>
          <TableHead>
            <TableRow>
              <TableHeaderCell isCheckbox />
              <TableHeaderCell sortable sortDirection={table.getSortDirection("name")} onSort={() => table.handleSort("name")}>Nome</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={table.getSortDirection("teams")} onSort={() => table.handleSort("teams")}>Times</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={table.getSortDirection("role")} onSort={() => table.handleSort("role")}>Tipo</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={table.getSortDirection("status")} onSort={() => table.handleSort("status")}>Status</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {table.filtered.map((u) => {
              const sb = STATUS_BADGE[u.status]!;
              return (
                <TableRow key={u.id} rowId={u.id}>
                  <TableCell isCheckbox rowId={u.id} />
                  <TableCell>
                    <AvatarLabelGroup
                      size="md"
                      initials={u.initials ?? undefined}
                      name={`${u.firstName} ${u.lastName}`}
                      supportingText={u.jobTitle ?? undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <div className={styles.teamBadges}>
                      {u.teams.map((team) => (
                        <Badge key={team} color="neutral">{team}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={styles.roleField}>
                      <button
                        ref={(el) => { rolePopoverRefs.current[u.id] = el; }}
                        className={styles.roleTrigger}
                        onClick={() => setRolePopoverUser(rolePopoverUser === u.id ? null : u.id)}
                        type="button"
                      >
                        <span className={styles.roleTriggerText}>
                          {roleLabelBySlug.get(resolveRoleSlug(u.roleType)) ?? u.roleType}
                        </span>
                        <CaretDown size={14} className={styles.roleChevron} />
                      </button>
                      <FilterDropdown
                        open={rolePopoverUser === u.id}
                        onClose={() => setRolePopoverUser(null)}
                        anchorRef={{ current: rolePopoverRefs.current[u.id] ?? null }}
                      >
                        <div className={styles.roleDropdown}>
                          {roleSelectionOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`${styles.roleOption} ${resolveRoleSlug(u.roleType) === opt.value ? styles.roleOptionActive : ""}`}
                              onClick={() => handleRoleChange(u.id, opt.value)}
                            >
                              <div className={styles.roleOptionText}>
                                <span className={styles.roleOptionLabel}>{opt.label}</span>
                                <span className={styles.roleOptionDesc}>{opt.description}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </FilterDropdown>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={sb.color}>{sb.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <RowActionsPopover
                      className={styles.actionsField}
                      items={getRowActions(u)}
                      open={actionsPopoverUser === u.id}
                      onToggle={() => setActionsPopoverUser(actionsPopoverUser === u.id ? null : u.id)}
                      onClose={() => setActionsPopoverUser(null)}
                      buttonAriaLabel={`Abrir ações de ${u.firstName} ${u.lastName}`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TableContent>
        <TableBulkActions count={table.selectedRows.size} onClear={table.clearSelection}>
          <Button variant="secondary" size="md" leftIcon={table.allSelectedInactive ? UserCheck : UserMinus} onClick={handleBulkToggleStatus}>
            {table.allSelectedInactive ? "Ativar" : "Desativar"}
          </Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleBulkDelete}>
            Excluir
          </Button>
        </TableBulkActions>
      </Table>

      <UserInviteModal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); inviteForm.reset(); }}
        firstName={inviteForm.firstName} onFirstNameChange={inviteForm.setFirstName}
        lastName={inviteForm.lastName} onLastNameChange={inviteForm.setLastName}
        nickname={inviteForm.nickname} onNicknameChange={inviteForm.setNickname}
        email={inviteForm.email} onEmailChange={inviteForm.setEmail}
        jobTitle={inviteForm.jobTitle} onJobTitleChange={inviteForm.setJobTitle}
        teams={inviteForm.teams} onTeamsChange={inviteForm.setTeams}
        teamOptions={inviteTeamOptions}
        birthDate={inviteForm.birthDate} onBirthDateChange={inviteForm.setBirthDate}
        gender={inviteForm.gender} onGenderChange={inviteForm.setGender}
        language={inviteForm.language} onLanguageChange={inviteForm.setLanguage}
        role={inviteForm.role} onRoleChange={inviteForm.setRole}
        roleOptions={roleSelectOptions}
        onInvite={handleInvite}
        inviteLoading={inviteLoading}
        canSubmit={!!inviteForm.firstName.trim() && !!inviteForm.lastName.trim() && !!inviteForm.email.trim()}
      />

      <UserEditModal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        firstName={editForm.firstName} onFirstNameChange={editForm.setFirstName}
        lastName={editForm.lastName} onLastNameChange={editForm.setLastName}
        nickname={editForm.nickname} onNicknameChange={editForm.setNickname}
        email={editForm.email} onEmailChange={editForm.setEmail}
        jobTitle={editForm.jobTitle} onJobTitleChange={editForm.setJobTitle}
        teams={editForm.teams} onTeamsChange={editForm.setTeams}
        teamOptions={inviteTeamOptions}
        birthDate={editForm.birthDate} onBirthDateChange={editForm.setBirthDate}
        gender={editForm.gender} onGenderChange={editForm.setGender}
        language={editForm.language} onLanguageChange={editForm.setLanguage}
        role={editForm.role} onRoleChange={editForm.setRole}
        roleOptions={roleSelectOptions}
        onSave={handleEditSave}
        canSubmit={!!editForm.firstName.trim() && !!editForm.lastName.trim() && !!editForm.email.trim()}
      />

      <UserImportModal
        open={importOpen}
        onClose={() => { setImportOpen(false); setImportFile(null); }}
        importFile={importFile}
        onFileChange={setImportFile}
        onDownloadTemplate={handleDownloadTemplate}
        onImport={handleImport}
      />

      <ConfirmModal
        open={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        title="Redefinir senha"
        body={<>Um e-mail de redefinição de senha será enviado para <strong>{resetPasswordUser?.email}</strong>. Deseja continuar?</>}
        confirmLabel="Enviar e-mail"
        onConfirm={handleResetPassword}
      />

      <ConfirmModal
        open={!!deactivateUser}
        onClose={() => setDeactivateUser(null)}
        title={deactivateUser?.status === "active" ? "Desativar usuário" : "Ativar usuário"}
        body={deactivateUser?.status === "active"
          ? <>Tem certeza que deseja desativar <strong>{deactivateUser.firstName} {deactivateUser.lastName}</strong>? O usuário perderá acesso à plataforma.</>
          : <>Tem certeza que deseja ativar <strong>{deactivateUser?.firstName} {deactivateUser?.lastName}</strong>? O usuário voltará a ter acesso à plataforma.</>
        }
        confirmLabel={deactivateUser?.status === "active" ? "Desativar" : "Ativar"}
        confirmVariant={deactivateUser?.status === "active" ? "danger" : "primary"}
        onConfirm={handleToggleStatus}
      />
    </>
  );
}
