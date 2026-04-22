import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
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
  AvatarLabelGroup,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FilterBar,
  FilterChip,
  FilterDropdown,
  Radio,
  toast,
  Select,
  DatePicker,
  RowActionsPopover,
  useDataTable,
  useFilterChips,
} from "@getbud-co/buds";
import type { PopoverItem, CalendarDate } from "@getbud-co/buds";
import {
  MagnifyingGlass,
  Plus,
  Envelope,
  PencilSimple,
  Key,
  UserMinus,
  UserCheck,
  CaretDown,
  UploadSimple,
  DownloadSimple,
  FileText,
  Trash,
} from "@phosphor-icons/react";
import type { UserStatus, Gender } from "@/types";
import { usePeopleData, type PeopleUserView } from "@/contexts/PeopleDataContext";
import { useConfigData } from "@/contexts/ConfigDataContext";
import { createRoleIdForOrg } from "@/lib/people-store";
import {
  createUser,
  listUsers,
  updateUser,
  deleteUserMembership,
  updateUserMembership,
  userErrorToMessage,
  type UserApiResponse,
} from "@/lib/users-api";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./UsersModule.module.css";

/** Extends the DB User with UI-only fields used in this module. */
type UserView = PeopleUserView;

const LANGUAGE_OPTIONS = [
  { value: "pt-br", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao-binario", label: "Não-binário" },
  { value: "prefiro-nao-dizer", label: "Prefiro não dizer" },
];

const STATUS_FILTER: { id: string; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativo" },
  { id: "inactive", label: "Inativo" },
  { id: "invited", label: "Convidado" },
  { id: "suspended", label: "Suspenso" },
];

const STATUS_BADGE: Record<UserStatus, { label: string; color: "success" | "neutral" | "warning" | "error" }> = {
  active: { label: "Ativo", color: "success" },
  inactive: { label: "Inativo", color: "neutral" },
  invited: { label: "Convidado", color: "warning" },
  suspended: { label: "Suspenso", color: "error" },
};

/** Fallback role slug when no default role is configured */
const DEFAULT_ROLE_SLUG = "colaborador";

function apiUserToView(u: UserApiResponse, orgId: string): PeopleUserView {
  const roleType = u.role ?? "colaborador";
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
    roleId: createRoleIdForOrg(orgId, roleType),
    roleType,
    teams: [],
  };
}

export function UsersModule() {
  const { setUsers, teamNameOptions } = usePeopleData();
  // pageUsers is local to this settings page — kept separate from PeopleDataContext to avoid
  // corrupting team memberships (setUsers rebuilds teams from user.teams arrays).
  const [pageUsers, setPageUsers] = useState<PeopleUserView[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const { activeOrgId, roleOptions, resolveRoleSlug } = useConfigData();
  const { getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deactivateUser, setDeactivateUser] = useState<UserView | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserView | null>(null);
  const [editUser, setEditUser] = useState<UserView | null>(null);

  /* invite form */
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteNickname, setInviteNickname] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [inviteTeams, setInviteTeams] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState("");
  const [inviteRoleOpen, setInviteRoleOpen] = useState(false);
  const inviteRoleBtnRef = useRef<HTMLButtonElement>(null);
  const [inviteBirthDate, setInviteBirthDate] = useState<CalendarDate | null>(null);
  const [inviteLanguage, setInviteLanguage] = useState("pt-br");
  const [inviteGender, setInviteGender] = useState("");

  /* edit form */
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editTeams, setEditTeams] = useState<string[]>([]);
  const [editRole, setEditRole] = useState("");
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const editRoleBtnRef = useRef<HTMLButtonElement>(null);
  const [editBirthDate, setEditBirthDate] = useState<CalendarDate | null>(null);
  const [editLanguage, setEditLanguage] = useState("pt-br");
  const [editGender, setEditGender] = useState("");

  const inviteTeamOptions = useMemo(
    () => teamNameOptions.map((teamName) => ({ value: teamName, label: teamName })),
    [teamNameOptions],
  );

  const roleSelectionOptions = useMemo(
    () => roleOptions.map((role) => ({ value: role.value, label: role.label, description: role.description || "Sem descrição" })),
    [roleOptions],
  );

  const roleFilterOptions = useMemo(
    () => ([
      { id: "all", label: "Todos os tipos" },
      ...roleSelectionOptions.map((role) => ({ id: role.value, label: role.label })),
    ]),
    [roleSelectionOptions],
  );

  const defaultInviteRole = useMemo(
    () => roleOptions.find((role) => role.isDefault)?.value ?? roleOptions[0]?.value ?? DEFAULT_ROLE_SLUG,
    [roleOptions],
  );

  const roleLabelBySlug = useMemo(
    () => new Map(roleSelectionOptions.map((role) => [role.value, role.label])),
    [roleSelectionOptions],
  );

  /* inline role popover on table */
  const [rolePopoverUser, setRolePopoverUser] = useState<string | null>(null);
  const rolePopoverRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* actions popover */
  const [actionsPopoverUser, setActionsPopoverUser] = useState<string | null>(null);

  /* sorting */
  type SortKey = "name" | "teams" | "role" | "status";
  const {
    selectedRows,
    clearSelection,
    sortKey,
    sortDir,
    handleSort,
    getSortDirection,
    handleSelectRow,
    handleSelectAll,
  } = useDataTable<SortKey>();

  /* filters */
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const statusChipRef = useRef<HTMLDivElement>(null);
  const roleChipRef = useRef<HTMLDivElement>(null);

  const chipRefs: Record<string, RefObject<HTMLDivElement | null>> = {
    status: statusChipRef,
    role: roleChipRef,
  };

  const {
    activeFilters,
    openFilter,
    setOpenFilter,
    addFilterAndOpen,
    removeFilter,
    clearAllFilters,
    toggleFilterDropdown,
    getAvailableFilters,
    ignoreChipRefs,
  } = useFilterChips({
    chipRefs,
    onResetFilter: (id: string) => {
      if (id === "status") setFilterStatus("all");
      if (id === "role") setFilterRole("all");
    },
  });

  const FILTER_OPTIONS = [
    { id: "status", label: "Status" },
    { id: "role", label: "Tipo de usuário" },
  ];

  const filtered = useMemo(() =>
    pageUsers
      .filter((u) => {
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        if (search && !fullName.includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
        if (activeFilters.includes("status") && filterStatus !== "all" && u.status !== filterStatus) return false;
        const roleSlug = resolveRoleSlug(u.roleType);
        if (activeFilters.includes("role") && filterRole !== "all" && roleSlug !== filterRole) return false;
        return true;
      })
      .sort((a, b) => {
        if (!sortKey) return 0;
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
          case "name": return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case "teams": return dir * (a.teams.join(", ")).localeCompare(b.teams.join(", "));
          case "role": return dir * resolveRoleSlug(a.roleType).localeCompare(resolveRoleSlug(b.roleType));
          case "status": return dir * a.status.localeCompare(b.status);
          default: return 0;
        }
      }),
    [pageUsers, search, activeFilters, filterStatus, filterRole, sortKey, sortDir, resolveRoleSlug],
  );

  const rowIds = useMemo(() => filtered.map((u) => u.id), [filtered]);

  const allSelectedInactive = useMemo(
    () => selectedRows.size > 0 && [...selectedRows].every((id) => pageUsers.find((u) => u.id === id)?.status === "inactive"),
    [selectedRows, pageUsers],
  );

  async function handleBulkToggleStatus() {
    const token = getToken();
    if (!token) return;

    const newStatus = allSelectedInactive ? "active" as const : "inactive" as const;
    const targets = pageUsers.filter((u) => selectedRows.has(u.id) && u.status !== "invited");

    const results = await Promise.allSettled(
      targets.map((u) => updateUser(u.id, {
        first_name: u.firstName,
        last_name: u.lastName,
        email: u.email,
        status: newStatus,
        nickname: u.nickname ?? undefined,
        job_title: u.jobTitle ?? undefined,
        birth_date: u.birthDate ?? undefined,
        language: u.language,
        gender: u.gender ?? undefined,
        phone: u.phone ?? undefined,
      }, token)),
    );

    const succeeded = new Set(targets.filter((_, i) => results[i]?.status === "fulfilled").map((u) => u.id));
    const failCount = results.filter((r) => r.status === "rejected").length;

    if (succeeded.size > 0) {
      setPageUsers((prev) => prev.map((u) => succeeded.has(u.id) ? { ...u, status: newStatus } : u));
    }
    clearSelection();

    if (failCount > 0) toast.error(`${failCount} operação(ões) falharam`);
    else toast.success(newStatus === "active" ? `${succeeded.size} usuário(s) ativado(s)` : `${succeeded.size} usuário(s) desativado(s)`);
  }

  async function handleBulkDelete() {
    const token = getToken();
    if (!token) return;

    const targets = [...selectedRows];
    const results = await Promise.allSettled(targets.map((id) => deleteUserMembership(id, token)));

    const succeeded = new Set(targets.filter((_, i) => results[i]?.status === "fulfilled"));
    const failCount = results.filter((r) => r.status === "rejected").length;

    if (succeeded.size > 0) {
      setPageUsers((prev) => prev.filter((u) => !succeeded.has(u.id)));
    }
    clearSelection();

    if (failCount > 0) toast.error(`${failCount} remoção(ões) falharam`);
    else toast.success(`${succeeded.size} usuário(s) removido(s)`);
  }

  function getFilterLabel(id: string): string {
    if (id === "status") return STATUS_FILTER.find((s) => s.id === filterStatus)?.label ?? "Status";
    if (id === "role") return roleFilterOptions.find((r) => r.id === filterRole)?.label ?? "Tipo";
    return id;
  }

  async function handleInvite() {
    const token = getToken();
    if (!token) return;

    const birthDateStr = inviteBirthDate
      ? `${inviteBirthDate.year}-${String(inviteBirthDate.month).padStart(2, "0")}-${String(inviteBirthDate.day).padStart(2, "0")}`
      : undefined;

    setInviteLoading(true);
    try {
      const created = await createUser(
        {
          first_name: inviteFirstName,
          last_name: inviteLastName,
          email: inviteEmail,
          password: crypto.randomUUID(),
          role: resolveRoleSlug(inviteRole),
          nickname: inviteNickname || undefined,
          job_title: inviteJobTitle || undefined,
          birth_date: birthDateStr,
          language: inviteLanguage,
          gender: inviteGender || undefined,
        },
        token,
      );

      const now = new Date().toISOString();
      const newUser: UserView = {
        id: created.id,
        orgId: activeOrgId,
        email: created.email,
        firstName: created.first_name,
        lastName: created.last_name,
        nickname: created.nickname ?? null,
        jobTitle: created.job_title ?? null,
        managerId: null,
        avatarUrl: null,
        initials: `${created.first_name[0] ?? ""}${created.last_name[0] ?? ""}`.toUpperCase(),
        birthDate: created.birth_date ?? null,
        gender: (created.gender as Gender) ?? null,
        language: created.language,
        phone: null,
        status: "invited",
        invitedAt: now,
        activatedAt: null,
        lastLoginAt: null,
        authProvider: "email",
        authProviderId: null,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
        deletedAt: null,
        roleId: createRoleIdForOrg(activeOrgId, resolveRoleSlug(inviteRole)),
        roleType: resolveRoleSlug(inviteRole),
        teams: inviteTeams,
      };

      setPageUsers((prev) => [...prev, newUser]);
      setUsers((prev) => [...prev, newUser]);
      setInviteOpen(false);
      setInviteFirstName("");
      setInviteLastName("");
      setInviteNickname("");
      setInviteEmail("");
      setInviteJobTitle("");
      setInviteTeams([]);
      setInviteRole(defaultInviteRole);
      setInviteBirthDate(null);
      setInviteLanguage("pt-br");
      setInviteGender("");
      toast.success("Convite enviado com sucesso");
    } catch (err) {
      toast.error(userErrorToMessage(err));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!deactivateUser) return;
    if (deactivateUser.status === "invited") {
      setDeactivateUser(null);
      return;
    }
    const token = getToken();
    if (!token) return;

    const newStatus = deactivateUser.status === "active" ? "inactive" as const : "active" as const;

    try {
      await updateUser(deactivateUser.id, {
        first_name: deactivateUser.firstName,
        last_name: deactivateUser.lastName,
        email: deactivateUser.email,
        status: newStatus,
        nickname: deactivateUser.nickname ?? undefined,
        job_title: deactivateUser.jobTitle ?? undefined,
        birth_date: deactivateUser.birthDate ?? undefined,
        language: deactivateUser.language,
        gender: deactivateUser.gender ?? undefined,
        phone: deactivateUser.phone ?? undefined,
      }, token);

      setPageUsers((prev) => prev.map((u) => u.id === deactivateUser.id ? { ...u, status: newStatus } : u));
      setDeactivateUser(null);
      toast.success(newStatus === "active" ? "Usuário ativado" : "Usuário desativado");
    } catch (err) {
      toast.error(userErrorToMessage(err));
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
      `Valores: ${LANGUAGE_OPTIONS.map((l) => l.value).join(" | ")}`,
      `Valores: ${GENDER_OPTIONS.map((g) => g.label).join(" | ")}`,
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
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditNickname(user.nickname ?? "");
    setEditEmail(user.email);
    setEditJobTitle(user.jobTitle ?? "");
    setEditTeams([...user.teams]);
    setEditRole(resolveRoleSlug(user.roleType));
    setEditGender(user.gender ?? "");
    setEditLanguage(user.language);
    if (user.birthDate) {
      const parts = user.birthDate.split("-");
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);

        if ([year, month, day].every((part) => !Number.isNaN(part))) {
          setEditBirthDate({ year, month, day });
        } else {
          setEditBirthDate(null);
        }
      } else {
        setEditBirthDate(null);
      }
    } else {
      setEditBirthDate(null);
    }
  }

  async function handleEditSave() {
    if (!editUser) return;
    const token = getToken();
    if (!token) return;

    const userStatus = (editUser.status === "active" || editUser.status === "inactive")
      ? editUser.status : "active";

    const birthDateStr = editBirthDate
      ? `${editBirthDate.year}-${String(editBirthDate.month).padStart(2, "0")}-${String(editBirthDate.day).padStart(2, "0")}`
      : undefined;

    try {
      await updateUser(editUser.id, {
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        status: userStatus,
        nickname: editNickname || undefined,
        job_title: editJobTitle || undefined,
        birth_date: birthDateStr,
        language: editLanguage,
        gender: editGender || undefined,
      }, token);

      const newRole = resolveRoleSlug(editRole);
      const currentRole = resolveRoleSlug(editUser.roleType);
      if (newRole !== currentRole) {
        const membershipStatus = editUser.status === "invited" ? "invited" as const : "active" as const;
        await updateUserMembership(editUser.id, { role: newRole, status: membershipStatus }, token);
      }

      setPageUsers((prev) => prev.map((u) => u.id === editUser.id ? {
        ...u,
        firstName: editFirstName,
        lastName: editLastName,
        nickname: editNickname || null,
        email: editEmail,
        jobTitle: editJobTitle || null,
        initials: `${editFirstName[0] ?? ""}${editLastName[0] ?? ""}`.toUpperCase(),
        birthDate: birthDateStr ?? null,
        gender: (editGender as Gender) || null,
        language: editLanguage,
        roleId: createRoleIdForOrg(activeOrgId, resolveRoleSlug(editRole)),
        roleType: resolveRoleSlug(editRole),
        updatedAt: new Date().toISOString(),
      } : u));
      setEditUser(null);
      toast.success("Perfil atualizado com sucesso");
    } catch (err) {
      toast.error(userErrorToMessage(err));
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const token = getToken();
    if (!token) return;

    const normalizedRole = resolveRoleSlug(newRole);
    const target = pageUsers.find((u) => u.id === userId);
    const membershipStatus = target?.status === "invited" ? "invited" as const : "active" as const;

    try {
      await updateUserMembership(userId, { role: normalizedRole, status: membershipStatus }, token);
      setPageUsers((prev) => prev.map((u) => u.id === userId
        ? { ...u, roleType: normalizedRole, roleId: createRoleIdForOrg(activeOrgId, normalizedRole) }
        : u));
      setRolePopoverUser(null);
      toast.success("Tipo de usuário atualizado");
    } catch (err) {
      toast.error(userErrorToMessage(err));
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setPageLoading(true);

    listUsers(token, { size: 50 })
      .then((res) => {
        if (cancelled) return;
        setPageUsers(res.data.map((u) => apiUserToView(u, activeOrgId)));
      })
      .catch((err) => {
        if (!cancelled) toast.error(userErrorToMessage(err));
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  useEffect(() => {
    if (!inviteRole && defaultInviteRole) {
      setInviteRole(defaultInviteRole);
    }
  }, [inviteRole, defaultInviteRole]);

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

  if (pageLoading) {
    return null;
  }

  return (
    <>
      <Table
        variant="divider"
        elevated={false}
        selectable
        selectedRows={selectedRows}
        rowIds={rowIds}
        onSelectRow={handleSelectRow}
        onSelectAll={(checked: boolean) => handleSelectAll(checked, rowIds)}
      >
        <TableCardHeader
          title="Usuários"
          badge={<Badge color="neutral">{filtered.length}</Badge>}
          actions={
            <div className={styles.headerActions}>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
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
            filters={getAvailableFilters(FILTER_OPTIONS)}
            onAddFilter={(id: string) => {
              addFilterAndOpen(id);
            }}
            onClearAll={activeFilters.length > 0 ? clearAllFilters : undefined}
          >
            {activeFilters.map((filterId: string) => (
              <div key={filterId} ref={chipRefs[filterId]} style={{ display: "inline-flex" }}>
                <FilterChip
                  label={getFilterLabel(filterId)}
                  active={openFilter === filterId}
                  onClick={() => toggleFilterDropdown(filterId)}
                  onRemove={() => removeFilter(filterId)}
                />
              </div>
            ))}
          </FilterBar>
        </div>

        <FilterDropdown
          open={openFilter === "status"}
          onClose={() => setOpenFilter(null)}
          anchorRef={statusChipRef}
          ignoreRefs={ignoreChipRefs}
        >
          <div className={styles.filterDropdownBody}>
            {STATUS_FILTER.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`${styles.filterActionItem} ${filterStatus === opt.id ? styles.filterActionItemActive : ""}`}
                onClick={() => { setFilterStatus(opt.id); setOpenFilter(null); }}
              >
                <Radio checked={filterStatus === opt.id} readOnly />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </FilterDropdown>

        <FilterDropdown
          open={openFilter === "role"}
          onClose={() => setOpenFilter(null)}
          anchorRef={roleChipRef}
          ignoreRefs={ignoreChipRefs}
        >
          <div className={styles.filterDropdownBody}>
            {roleFilterOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`${styles.filterActionItem} ${filterRole === opt.id ? styles.filterActionItemActive : ""}`}
                onClick={() => { setFilterRole(opt.id); setOpenFilter(null); }}
              >
                <Radio checked={filterRole === opt.id} readOnly />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </FilterDropdown>

        <TableContent>
          <TableHead>
            <TableRow>
              <TableHeaderCell isCheckbox />
              <TableHeaderCell sortable sortDirection={getSortDirection("name")} onSort={() => handleSort("name")}>Nome</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("teams")} onSort={() => handleSort("teams")}>Times</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("role")} onSort={() => handleSort("role")}>Tipo</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("status")} onSort={() => handleSort("status")}>Status</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((u) => {
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
        <TableBulkActions count={selectedRows.size} onClear={clearSelection}>
          <Button variant="secondary" size="md" leftIcon={allSelectedInactive ? UserCheck : UserMinus} onClick={handleBulkToggleStatus}>
            {allSelectedInactive ? "Ativar" : "Desativar"}
          </Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleBulkDelete}>
            Excluir
          </Button>
        </TableBulkActions>
      </Table>

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} size="md">
        <ModalHeader title="Convidar usuário" onClose={() => setInviteOpen(false)} />
        <ModalBody>
          <div className={styles.formStack}>
            <div className={styles.formRow}>
              <Input label="Nome" value={inviteFirstName} onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteFirstName(e.target.value)} placeholder="Nome" />
              <Input label="Sobrenome" value={inviteLastName} onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteLastName(e.target.value)} placeholder="Sobrenome" />
            </div>
            <div className={styles.formRow}>
              <Input label="Apelido" value={inviteNickname} onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteNickname(e.target.value)} placeholder="Como prefere ser chamado" />
              <Input label="E-mail" value={inviteEmail} onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)} placeholder="email@empresa.com" leftIcon={Envelope} />
            </div>
            <div className={styles.formRow}>
              <Input label="Cargo" value={inviteJobTitle} onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteJobTitle(e.target.value)} placeholder="Ex: Product Manager" />
              <Select label="Time" value={inviteTeams} onChange={setInviteTeams} options={inviteTeamOptions} multiple />
            </div>
            <div className={styles.formRow}>
              <div className={styles.dateField}>
                <span className={styles.roleLabel}>Data de nascimento</span>
                <DatePicker mode="single" value={inviteBirthDate} onChange={setInviteBirthDate} />
              </div>
              <Select label="Gênero" value={inviteGender} onChange={setInviteGender} options={GENDER_OPTIONS} />
            </div>
            <Select label="Idioma" value={inviteLanguage} onChange={setInviteLanguage} options={LANGUAGE_OPTIONS} />
            <div className={styles.roleField}>
              <span className={styles.roleLabel}>Tipo de usuário</span>
              <button
                ref={inviteRoleBtnRef}
                className={styles.roleTrigger}
                onClick={() => setInviteRoleOpen((v) => !v)}
                type="button"
              >
                <span className={styles.roleTriggerText}>
                   {roleLabelBySlug.get(inviteRole) ?? "Selecione"}
                </span>
                <CaretDown size={14} className={styles.roleChevron} />
              </button>
              <FilterDropdown
                open={inviteRoleOpen}
                onClose={() => setInviteRoleOpen(false)}
                anchorRef={inviteRoleBtnRef}
              >
                <div className={styles.roleDropdown}>
                   {roleSelectionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.roleOption} ${inviteRole === opt.value ? styles.roleOptionActive : ""}`}
                      onClick={() => { setInviteRole(opt.value); setInviteRoleOpen(false); }}
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
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setInviteOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={inviteLoading || !inviteFirstName.trim() || !inviteLastName.trim() || !inviteEmail.trim()} onClick={handleInvite}>
            {inviteLoading ? "Enviando..." : "Enviar convite"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit profile modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} size="md">
        <ModalHeader title="Editar perfil" onClose={() => setEditUser(null)} />
        <ModalBody>
          <div className={styles.formStack}>
            <div className={styles.formRow}>
              <Input label="Nome" value={editFirstName} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditFirstName(e.target.value)} placeholder="Nome" />
              <Input label="Sobrenome" value={editLastName} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditLastName(e.target.value)} placeholder="Sobrenome" />
            </div>
            <div className={styles.formRow}>
              <Input label="Apelido" value={editNickname} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditNickname(e.target.value)} placeholder="Como prefere ser chamado" />
              <Input label="E-mail" value={editEmail} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditEmail(e.target.value)} placeholder="email@empresa.com" leftIcon={Envelope} />
            </div>
            <div className={styles.formRow}>
              <Input label="Cargo" value={editJobTitle} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditJobTitle(e.target.value)} placeholder="Ex: Product Manager" />
              <Select label="Time" value={editTeams} onChange={setEditTeams} options={inviteTeamOptions} multiple />
            </div>
            <div className={styles.formRow}>
              <div className={styles.dateField}>
                <span className={styles.roleLabel}>Data de nascimento</span>
                <DatePicker mode="single" value={editBirthDate} onChange={setEditBirthDate} />
              </div>
              <Select label="Gênero" value={editGender} onChange={setEditGender} options={GENDER_OPTIONS} />
            </div>
            <Select label="Idioma" value={editLanguage} onChange={setEditLanguage} options={LANGUAGE_OPTIONS} />
            <div className={styles.roleField}>
              <span className={styles.roleLabel}>Tipo de usuário</span>
              <button
                ref={editRoleBtnRef}
                className={styles.roleTrigger}
                onClick={() => setEditRoleOpen((v) => !v)}
                type="button"
              >
                <span className={styles.roleTriggerText}>
                  {roleLabelBySlug.get(editRole) ?? "Selecione"}
                </span>
                <CaretDown size={14} className={styles.roleChevron} />
              </button>
              <FilterDropdown
                open={editRoleOpen}
                onClose={() => setEditRoleOpen(false)}
                anchorRef={editRoleBtnRef}
              >
                <div className={styles.roleDropdown}>
                  {roleSelectionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.roleOption} ${editRole === opt.value ? styles.roleOptionActive : ""}`}
                      onClick={() => { setEditRole(opt.value); setEditRoleOpen(false); }}
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
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setEditUser(null)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()} onClick={handleEditSave}>
            Salvar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Import modal */}
      <Modal open={importOpen} onClose={() => { setImportOpen(false); setImportFile(null); }} size="sm">
        <ModalHeader title="Importar usuários" onClose={() => { setImportOpen(false); setImportFile(null); }} />
        <ModalBody>
          <div className={styles.formStack}>
            <p className={styles.importDesc}>
              Faça o upload de uma planilha com os dados dos usuários para cadastrá-los em massa na plataforma.
            </p>
            <button type="button" className={styles.templateLink} onClick={handleDownloadTemplate}>
              <FileText size={20} />
              <div className={styles.templateLinkText}>
                <span className={styles.templateLinkTitle}>Baixar template</span>
                <span className={styles.templateLinkDesc}>Template CSV com os campos e valores aceitos</span>
              </div>
              <DownloadSimple size={16} />
            </button>
            <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                className={styles.fileInput}
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              <UploadSimple size={24} />
              {importFile ? (
                <span className={styles.uploadFileName}>{importFile.name}</span>
              ) : (
                <>
                  <span className={styles.uploadText}>Arraste ou clique para selecionar</span>
                  <span className={styles.uploadHint}>.xls, .xlsx ou .csv</span>
                </>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => { setImportOpen(false); setImportFile(null); }}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!importFile} onClick={handleImport}>
            Importar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reset password confirmation */}
      <Modal open={!!resetPasswordUser} onClose={() => setResetPasswordUser(null)} size="sm">
        <ModalHeader title="Redefinir senha" onClose={() => setResetPasswordUser(null)} />
        <ModalBody>
          {resetPasswordUser && (
            <p className={styles.confirmText}>
              Um e-mail de redefinição de senha será enviado para <strong>{resetPasswordUser.email}</strong>. Deseja continuar?
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setResetPasswordUser(null)}>Cancelar</Button>
          <Button variant="primary" size="md" leftIcon={Key} onClick={handleResetPassword}>
            Enviar e-mail
          </Button>
        </ModalFooter>
      </Modal>

      {/* Activate/Deactivate confirmation */}
      <Modal open={!!deactivateUser} onClose={() => setDeactivateUser(null)} size="sm">
        <ModalHeader title={deactivateUser?.status === "active" ? "Desativar usuário" : "Ativar usuário"} onClose={() => setDeactivateUser(null)} />
        <ModalBody>
          {deactivateUser && (
            <p className={styles.confirmText}>
              {deactivateUser.status === "active"
                ? <>Tem certeza que deseja desativar <strong>{deactivateUser.firstName} {deactivateUser.lastName}</strong>? O usuário perderá acesso à plataforma.</>
                : <>Tem certeza que deseja ativar <strong>{deactivateUser.firstName} {deactivateUser.lastName}</strong>? O usuário voltará a ter acesso à plataforma.</>
              }
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeactivateUser(null)}>Cancelar</Button>
          <Button variant={deactivateUser?.status === "active" ? "danger" : "primary"} size="md" onClick={handleToggleStatus}>
            {deactivateUser?.status === "active" ? "Desativar" : "Ativar"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
