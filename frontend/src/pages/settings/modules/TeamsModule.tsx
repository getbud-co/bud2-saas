import { useState, useRef, useMemo, type ChangeEvent, type RefObject } from "react";
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
  AvatarGroup,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FilterBar,
  FilterChip,
  FilterDropdown,
  Radio,
  toast,
  RowActionsPopover,
  useDataTable,
  useFilterChips,
} from "@getbud-co/buds";
import type { PopoverItem, AvatarGroupItem } from "@getbud-co/buds";
import {
  MagnifyingGlass,
  Plus,
  PencilSimple,
  UsersThree,
  Trash,
  Archive,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import type { Team, TeamMember, TeamColor } from "@/types";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { useConfigData } from "@/contexts/ConfigDataContext";
import { TeamModal } from "./TeamModal";
import type { PersonView } from "./TeamModal";
import styles from "./TeamsModule.module.css";

/* ——— View helpers ——— */

/** Convenience accessor — extracts flat person data from a TeamMember. */
function personFromMember(m: TeamMember): PersonView | null {
  if (!m.user) return null;
  return {
    id: m.user.id,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    jobTitle: m.user.jobTitle ?? "",
    initials: m.user.initials ?? "",
    teamIds: [],
  };
}

/* ——— Constants ——— */

const STATUS_FILTER = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativo" },
  { id: "archived", label: "Arquivado" },
];

const STATUS_BADGE: Record<string, { label: string; color: "success" | "neutral" }> = {
  active: { label: "Ativo", color: "success" },
  archived: { label: "Arquivado", color: "neutral" },
};

/* ——— Component ——— */

export function TeamsModule() {
  const { teams, setTeams, orgPeople } = usePeopleData();
  const { activeOrgId } = useConfigData();
  const [search, setSearch] = useState("");

  /* sorting */
  type SortKey = "name" | "members" | "status";
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
  const statusChipRef = useRef<HTMLDivElement>(null);
  const chipRefs: Record<string, RefObject<HTMLDivElement | null>> = { status: statusChipRef };

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
    onResetFilter: (id) => {
      if (id === "status") setFilterStatus("all");
    },
  });

  const FILTER_OPTIONS = [{ id: "status", label: "Status" }];

  /* actions popover */
  const [actionsPopoverTeam, setActionsPopoverTeam] = useState<string | null>(null);

  /* TeamModal (unified: create / edit / manage members) */
  const [teamModalState, setTeamModalState] = useState<{
    team: Team | null;
    tab: "details" | "members";
  } | null>(null);

  /* delete modal */
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);

  /* ——— Derived ——— */

  const filtered = useMemo(() =>
    teams
      .filter((t) => {
        if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !(t.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
        if (activeFilters.includes("status") && filterStatus !== "all" && t.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        if (!sortKey) return 0;
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
          case "name": return dir * a.name.localeCompare(b.name);
          case "members": return dir * ((a.members ?? []).length - (b.members ?? []).length);
          case "status": return dir * a.status.localeCompare(b.status);
          default: return 0;
        }
      }),
    [teams, search, activeFilters, filterStatus, sortKey, sortDir],
  );

  const rowIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const teamIdByName = useMemo(
    () => new Map(teams.map((team) => [team.name, team.id])),
    [teams],
  );
  const peoplePool = useMemo(() => {
    return orgPeople.map((person) => ({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      jobTitle: person.jobTitle ?? "",
      initials: person.initials ?? `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase(),
      teamIds: person.teams
        .map((teamName) => teamIdByName.get(teamName))
        .filter((teamId): teamId is string => !!teamId),
    }));
  }, [orgPeople, teamIdByName]);

  /* ——— Filter helpers ——— */

  function getFilterLabel(id: string): string {
    if (id === "status") return STATUS_FILTER.find((s) => s.id === filterStatus)?.label ?? "Status";
    return id;
  }

  /* ——— Open TeamModal ——— */

  function openCreate() {
    setTeamModalState({ team: null, tab: "details" });
  }

  function openEdit(team: Team) {
    setTeamModalState({ team, tab: "details" });
    setActionsPopoverTeam(null);
  }

  function openMembers(team: Team) {
    setTeamModalState({ team, tab: "members" });
    setActionsPopoverTeam(null);
  }

  /* ——— Save from TeamModal ——— */

  function handleTeamModalSave(data: {
    name: string;
    description: string;
    color: TeamColor;
    members: TeamMember[];
  }) {
    const leader = data.members.find((m) => m.roleInTeam === "leader");
    const leaderId = leader?.userId ?? null;
    const editingTeam = teamModalState?.team;

    if (editingTeam) {
      setTeams((prev) => prev.map((t) => t.id === editingTeam.id ? {
        ...t,
        name: data.name,
        description: data.description,
        color: data.color,
        leaderId,
        members: data.members,
      } : t));
      toast.success(`Time "${data.name}" atualizado`);
    } else {
      const newId = String(Date.now());
      const now = new Date().toISOString();
      const members = data.members.map((m) => ({ ...m, teamId: newId }));
      const newTeam: Team = {
        id: newId,
        orgId: activeOrgId,
        name: data.name,
        description: data.description || null,
        color: data.color,
        leaderId,
        parentTeamId: null,
        status: "active",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        members,
      };
      setTeams((prev) => [...prev, newTeam]);
      toast.success(`Time "${data.name}" criado`);
    }

    setTeamModalState(null);
  }

  /* ——— Status toggle ——— */

  function handleToggleStatus(team: Team) {
    const newStatus = team.status === "active" ? "archived" as const : "active" as const;
    setTeams((prev) => prev.map((t) => t.id === team.id ? { ...t, status: newStatus } : t));
    setActionsPopoverTeam(null);
    toast.success(newStatus === "active" ? `"${team.name}" ativado` : `"${team.name}" arquivado`);
  }

  /* ——— Delete ——— */

  function handleDelete() {
    if (!deleteTeam) return;
    setTeams((prev) => prev.filter((t) => t.id !== deleteTeam.id));
    setDeleteTeam(null);
    toast.success(`Time "${deleteTeam.name}" excluído`);
  }

  /* ——— Bulk actions ——— */

  function handleBulkArchive() {
    setTeams((prev) => prev.map((t) => selectedRows.has(t.id) ? { ...t, status: "archived" } : t));
    toast.success(`${selectedRows.size} time(s) arquivado(s)`);
    clearSelection();
  }

  function handleBulkDelete() {
    setTeams((prev) => prev.filter((t) => !selectedRows.has(t.id)));
    toast.success(`${selectedRows.size} time(s) excluído(s)`);
    clearSelection();
  }

  /* ——— Row actions ——— */

  function getRowActions(team: Team): PopoverItem[] {
    const items: PopoverItem[] = [
      { id: "edit", label: "Editar time", icon: PencilSimple, onClick: () => openEdit(team) },
      { id: "members", label: "Gerenciar membros", icon: UsersThree, onClick: () => openMembers(team) },
    ];
    if (team.status === "active") {
      items.push({ id: "archive", label: "Arquivar time", icon: Archive, onClick: () => handleToggleStatus(team) });
    } else {
      items.push({ id: "activate", label: "Ativar time", icon: ArrowCounterClockwise, onClick: () => handleToggleStatus(team) });
    }
    items.push({ id: "delete", label: "Excluir time", icon: Trash, danger: true, onClick: () => { setDeleteTeam(team); setActionsPopoverTeam(null); } });
    return items;
  }

  /* ——— Render ——— */

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
          title="Times"
          badge={<Badge color="neutral">{filtered.length}</Badge>}
          actions={
            <div className={styles.headerActions}>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar times..."
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  leftIcon={MagnifyingGlass}
                />
              </div>
              <Button variant="primary" size="md" leftIcon={Plus} onClick={openCreate}>
                Novo time
              </Button>
            </div>
          }
        />

        <div className={styles.toolbar}>
          <FilterBar
            filters={getAvailableFilters(FILTER_OPTIONS)}
            onAddFilter={addFilterAndOpen}
            onClearAll={activeFilters.length > 0 ? clearAllFilters : undefined}
          >
            {activeFilters.map((filterId) => (
              <div key={filterId} ref={filterId === "status" ? statusChipRef : undefined} style={{ display: "inline-flex" }}>
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

        <TableContent>
          <TableHead>
            <TableRow>
              <TableHeaderCell isCheckbox />
              <TableHeaderCell sortable sortDirection={getSortDirection("name")} onSort={() => handleSort("name")}>Nome</TableHeaderCell>
              <TableHeaderCell>Líder</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("members")} onSort={() => handleSort("members")}>Membros</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("status")} onSort={() => handleSort("status")}>Status</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((team) => {
              const sb = STATUS_BADGE[team.status]!;
              const members = team.members ?? [];
              const leaderMember = team.leaderId ? members.find((m) => m.userId === team.leaderId) : null;
              const leader = leaderMember ? personFromMember(leaderMember) : null;
              const avatars: AvatarGroupItem[] = members.slice(0, 5).map((m) => ({ initials: m.user?.initials ?? "" }));

              return (
                <TableRow key={team.id} rowId={team.id}>
                  <TableCell isCheckbox rowId={team.id} />
                  <TableCell>
                    <div className={styles.teamNameCell}>
                      <Badge color={team.color} size="sm">{team.name}</Badge>
                      {team.description && (
                        <span className={styles.teamDesc}>{team.description}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {leader ? (
                      <AvatarLabelGroup
                        size="md"
                        initials={leader.initials}
                        name={`${leader.firstName} ${leader.lastName}`}
                        supportingText={leader.jobTitle}
                      />
                    ) : (
                      <span className={styles.noLeader}>Sem líder</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={styles.membersCell}>
                      {members.length > 0 ? (
                        <>
                          <AvatarGroup
                            size="xs"
                            avatars={avatars}
                            maxVisible={4}
                            showAddButton
                            onAddClick={() => openMembers(team)}
                          />
                          <span className={styles.memberCount}>{members.length}</span>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={styles.addMembersBtn}
                          onClick={() => openMembers(team)}
                        >
                          <UsersThree size={14} />
                          <span>Adicionar</span>
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={sb.color}>{sb.label}</Badge>
                  </TableCell>
                <TableCell>
                    <RowActionsPopover
                      className={styles.actionsField}
                      items={getRowActions(team)}
                      open={actionsPopoverTeam === team.id}
                      onToggle={() => setActionsPopoverTeam(actionsPopoverTeam === team.id ? null : team.id)}
                      onClose={() => setActionsPopoverTeam(null)}
                      buttonAriaLabel={`Abrir ações do time ${team.name}`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TableContent>

        <TableBulkActions count={selectedRows.size} onClear={clearSelection}>
          <Button variant="secondary" size="md" leftIcon={Archive} onClick={handleBulkArchive}>
            Arquivar
          </Button>
          <Button variant="secondary" size="md" leftIcon={Trash} onClick={handleBulkDelete}>
            Excluir
          </Button>
        </TableBulkActions>
      </Table>

      {/* ——— TeamModal (create / edit / manage members) ——— */}
      <TeamModal
        open={!!teamModalState}
        team={teamModalState?.team ?? null}
        initialTab={teamModalState?.tab ?? "details"}
        peoplePool={peoplePool}
        allTeams={teams.map((t) => ({ id: t.id, name: t.name }))}
        onClose={() => setTeamModalState(null)}
        onSave={handleTeamModalSave}
      />

      {/* ——— Delete Confirmation ——— */}
      <Modal open={!!deleteTeam} onClose={() => setDeleteTeam(null)} size="sm">
        {deleteTeam && (
          <>
            <ModalHeader title="Excluir time" onClose={() => setDeleteTeam(null)} />
            <ModalBody>
              <p className={styles.confirmText}>
                Tem certeza que deseja excluir o time <strong>{deleteTeam.name}</strong>?
                Esta ação removerá o time de todos os colaboradores associados e não pode ser desfeita.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" size="md" onClick={() => setDeleteTeam(null)}>Cancelar</Button>
              <Button variant="danger" size="md" leftIcon={Trash} onClick={handleDelete}>Excluir</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
}
