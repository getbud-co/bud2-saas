import { useState, useMemo, useEffect, useRef, useCallback, memo } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Badge,
  AvatarLabelGroup,
  Checkbox,
  FilterBar,
  FilterChip,
  FilterDropdown,
  Radio,
  TabBar,
  toast,
} from "@getbud-co/buds";
import { MagnifyingGlass, UsersThree, X, CaretDown } from "@phosphor-icons/react";
import type { Team, TeamMember, TeamColor } from "@/types";
import styles from "./TeamModal.module.css";

/* ——— Types ——— */

export interface PersonView {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  initials: string;
  teamIds: string[];
}

export interface TeamModalProps {
  open: boolean;
  /** null = creating a new team */
  team: Team | null;
  /** Which tab to show first. Default: "details" */
  initialTab?: "details" | "members";
  peoplePool: PersonView[];
  allTeams: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    color: TeamColor;
    members: TeamMember[];
  }) => void;
}

/* ——— Constants ——— */

const COLOR_OPTIONS: { value: TeamColor; label: string }[] = [
  { value: "neutral", label: "Cinza" },
  { value: "orange", label: "Laranja" },
  { value: "wine", label: "Vinho" },
  { value: "caramel", label: "Caramelo" },
  { value: "success", label: "Verde" },
  { value: "warning", label: "Amarelo" },
  { value: "error", label: "Vermelho" },
];

const ROLE_OPTIONS: { id: TeamMember["roleInTeam"]; label: string }[] = [
  { id: "leader",   label: "Líder" },
  { id: "member",   label: "Membro" },
  { id: "observer", label: "Observador" },
];

const ROLE_BADGE_COLOR: Record<TeamMember["roleInTeam"], "wine" | "caramel" | "neutral"> = {
  leader:   "wine",
  member:   "caramel",
  observer: "neutral",
};

const ROLE_LABEL: Record<TeamMember["roleInTeam"], string> = {
  leader:   "Líder",
  member:   "Membro",
  observer: "Observador",
};

const SEARCH_FILTERS = [
  { id: "membership", label: "Situação" },
  { id: "role",       label: "Papel" },
  { id: "cargo",      label: "Cargo" },
  { id: "time",       label: "Time" },
];

const MEMBERS_FILTERS = [
  { id: "role", label: "Papel" },
];

const MEMBERSHIP_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "out", label: "Fora deste time" },
  { id: "in",  label: "Neste time" },
] as const;

/* ——— Helper ——— */

function memberFromPerson(
  person: PersonView,
  teamId: string,
  role: TeamMember["roleInTeam"] = "member",
): TeamMember {
  return {
    teamId,
    userId: person.id,
    roleInTeam: role,
    joinedAt: new Date().toISOString(),
    user: {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      initials: person.initials,
      jobTitle: person.jobTitle,
      avatarUrl: null,
    },
  };
}

/* ——— Component ——— */

export const TeamModal = memo(function TeamModal({
  open,
  team,
  initialTab = "details",
  peoplePool,
  allTeams,
  onClose,
  onSave,
}: TeamModalProps) {
  const isCreating = team === null;

  /* ——— Tabs ——— */
  const [activeTab, setActiveTab] = useState<"details" | "members">(initialTab);

  /* ——— Details form ——— */
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState<TeamColor>("neutral");

  /* ——— Members ——— */
  const [pendingMembers, setPendingMembers] = useState<TeamMember[]>([]);
  const [originalMembers, setOriginalMembers] = useState<TeamMember[]>([]);

  /* ——— Search ——— */
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ——— Search panel filters ——— */
  const [searchActiveFilters, setSearchActiveFilters] = useState<string[]>([]);
  const [searchOpenFilter,    setSearchOpenFilter]    = useState<string | null>(null);
  const [filterMembership,    setFilterMembership]    = useState("all");
  const [filterRole,          setFilterRole]          = useState("all");
  const [filterCargos,        setFilterCargos]        = useState<string[]>([]);
  const [filterTeamIds,       setFilterTeamIds]       = useState<string[]>([]);

  const membershipChipRef = useRef<HTMLDivElement>(null);
  const roleChipRef       = useRef<HTMLDivElement>(null);
  const cargoChipRef      = useRef<HTMLDivElement>(null);
  const timeChipRef       = useRef<HTMLDivElement>(null);

  /* ——— Members panel filters ——— */
  const [membersActiveFilters, setMembersActiveFilters] = useState<string[]>([]);
  const [membersOpenFilter,    setMembersOpenFilter]    = useState<string | null>(null);
  const [filterMembersRole,    setFilterMembersRole]    = useState("all");
  const membersRoleChipRef = useRef<HTMLDivElement>(null);

  /* ——— Role dropdown per member ——— */
  const [openRoleFor, setOpenRoleFor] = useState<string | null>(null);
  const roleButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* ——— Mobile sub-tabs (within members tab) ——— */
  const [mobileMembersTab, setMobileMembersTab] = useState<"add" | "members">("add");

  /* ——— Initialize on open ——— */
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setFormName(team?.name ?? "");
      setFormDesc(team?.description ?? "");
      setFormColor(team?.color ?? "neutral");
      const initial = team?.members ?? [];
      setPendingMembers(initial);
      setOriginalMembers(initial);
      setSearch("");
      setSearchActiveFilters([]);
      setSearchOpenFilter(null);
      setFilterMembership("all");
      setFilterRole("all");
      setFilterCargos([]);
      setFilterTeamIds([]);
      setMembersActiveFilters([]);
      setMembersOpenFilter(null);
      setFilterMembersRole("all");
      setOpenRoleFor(null);
      setMobileMembersTab("add");
    }
  }, [open, team, initialTab]);

  /* ——— Auto-focus search when switching to members tab ——— */
  useEffect(() => {
    if (open && activeTab === "members") {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, activeTab]);

  /* ——— Intercept Escape when role dropdown is open ——— */
  useEffect(() => {
    if (!openRoleFor) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); setOpenRoleFor(null); }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [openRoleFor]);

  /* ——— Derived ——— */

  const pendingIds = useMemo(
    () => new Set(pendingMembers.map((m) => m.userId)),
    [pendingMembers],
  );

  const pendingRoleMap = useMemo(
    () => new Map(pendingMembers.map((m) => [m.userId, m.roleInTeam])),
    [pendingMembers],
  );

  const addedIds = useMemo(() => {
    const origIds = new Set(originalMembers.map((m) => m.userId));
    return new Set(pendingMembers.filter((m) => !origIds.has(m.userId)).map((m) => m.userId));
  }, [pendingMembers, originalMembers]);

  const hasDetailsChanges = useMemo(() => {
    if (isCreating) return formName.trim() !== "" || formDesc.trim() !== "" || formColor !== "neutral";
    return (
      formName !== (team?.name ?? "") ||
      formDesc !== (team?.description ?? "") ||
      formColor !== (team?.color ?? "neutral")
    );
  }, [isCreating, formName, formDesc, formColor, team]);

  const hasMembersChanges = useMemo(() => {
    if (pendingMembers.length !== originalMembers.length) return true;
    const origMap = new Map(originalMembers.map((m) => [m.userId, m.roleInTeam]));
    return pendingMembers.some(
      (m) => !origMap.has(m.userId) || origMap.get(m.userId) !== m.roleInTeam,
    );
  }, [pendingMembers, originalMembers]);

  const hasChanges = hasDetailsChanges || hasMembersChanges;

  const cargoOptions = useMemo(() => {
    const unique = [...new Set(peoplePool.map((p) => p.jobTitle))].sort((a, b) =>
      a.localeCompare(b),
    );
    return unique;
  }, [peoplePool]);

  const teamOptions = useMemo(
    () => allTeams.filter((t) => t.id !== team?.id),
    [allTeams, team],
  );

  // Lista de busca: ordem alfabética FIXA
  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();

    let list = [...peoplePool].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );

    if (q) {
      list = list.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.jobTitle.toLowerCase().includes(q),
      );
    }

    if (filterMembership === "in")  list = list.filter((p) =>  pendingIds.has(p.id));
    if (filterMembership === "out") list = list.filter((p) => !pendingIds.has(p.id));

    if (filterRole !== "all") {
      list = list.filter(
        (p) => pendingIds.has(p.id) && pendingRoleMap.get(p.id) === filterRole,
      );
    }

    if (filterCargos.length > 0) {
      list = list.filter((p) => filterCargos.includes(p.jobTitle));
    }

    if (filterTeamIds.length > 0) {
      list = list.filter((p) => filterTeamIds.some((tid) => p.teamIds.includes(tid)));
    }

    return list;
  }, [search, peoplePool, filterMembership, filterRole, filterCargos, filterTeamIds, pendingIds, pendingRoleMap]);

  const filteredMembers = useMemo(() => {
    if (filterMembersRole === "all") return pendingMembers;
    return pendingMembers.filter((m) => m.roleInTeam === filterMembersRole);
  }, [pendingMembers, filterMembersRole]);

  /* ——— Actions ——— */

  const handleTogglePerson = useCallback(
    (person: PersonView) => {
      if (pendingIds.has(person.id)) {
        setPendingMembers((prev) => {
          const target = prev.find((m) => m.userId === person.id);
          if (target?.roleInTeam === "leader") {
            const leaderCount = prev.filter((m) => m.roleInTeam === "leader").length;
            if (leaderCount <= 1) {
              toast.error("O time precisa ter pelo menos um líder. Atribua outro líder antes de remover.");
              return prev;
            }
          }
          return prev.filter((m) => m.userId !== person.id);
        });
      } else {
        const teamId = team?.id ?? "__new__";
        setPendingMembers((prev) => [...prev, memberFromPerson(person, teamId)]);
      }
    },
    [pendingIds, team],
  );

  const handleChangeRole = useCallback(
    (userId: string, role: TeamMember["roleInTeam"]) => {
      setPendingMembers((prev) => {
        const current = prev.find((m) => m.userId === userId);
        if (current?.roleInTeam === "leader" && role !== "leader") {
          const leaderCount = prev.filter((m) => m.roleInTeam === "leader").length;
          if (leaderCount <= 1) {
            toast.error("O time precisa ter pelo menos um líder");
            return prev;
          }
        }
        return prev.map((m) => {
          if (m.userId === userId) return { ...m, roleInTeam: role };
          if (role === "leader" && m.roleInTeam === "leader") return { ...m, roleInTeam: "member" };
          return m;
        });
      });
      setOpenRoleFor(null);
    },
    [],
  );

  const handleRemoveMember = useCallback((userId: string) => {
    setPendingMembers((prev) => {
      const target = prev.find((m) => m.userId === userId);
      if (target?.roleInTeam === "leader") {
        const leaderCount = prev.filter((m) => m.roleInTeam === "leader").length;
        if (leaderCount <= 1) {
          toast.error("O time precisa ter pelo menos um líder. Atribua outro líder antes de remover.");
          return prev;
        }
      }
      return prev.filter((m) => m.userId !== userId);
    });
  }, []);

  /* ——— Filter helpers ——— */

  function handleToggleCargoFilter(cargo: string) {
    setFilterCargos((prev) =>
      prev.includes(cargo) ? prev.filter((c) => c !== cargo) : [...prev, cargo],
    );
  }

  function handleToggleTeamFilter(teamId: string) {
    setFilterTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  }

  function getSearchFilterLabel(id: string): string {
    if (id === "membership") {
      return MEMBERSHIP_OPTIONS.find((o) => o.id === filterMembership)?.label ?? "Situação";
    }
    if (id === "role") {
      return filterRole === "all" ? "Papel" : (ROLE_LABEL[filterRole as TeamMember["roleInTeam"]] ?? "Papel");
    }
    if (id === "cargo") {
      if (filterCargos.length === 0) return "Cargo";
      if (filterCargos.length === 1) return filterCargos[0] ?? "Cargo";
      return `${filterCargos.length} cargos`;
    }
    if (id === "time") {
      if (filterTeamIds.length === 0) return "Time";
      if (filterTeamIds.length === 1) {
        return teamOptions.find((t) => t.id === filterTeamIds[0])?.name ?? "Time";
      }
      return `${filterTeamIds.length} times`;
    }
    return id;
  }

  function getMembersFilterLabel(id: string): string {
    if (id === "role") {
      return filterMembersRole === "all" ? "Papel" : (ROLE_LABEL[filterMembersRole as TeamMember["roleInTeam"]] ?? "Papel");
    }
    return id;
  }

  function removeSearchFilter(filterId: string) {
    setSearchActiveFilters((prev) => prev.filter((f) => f !== filterId));
    if (filterId === "membership") setFilterMembership("all");
    if (filterId === "role")       setFilterRole("all");
    if (filterId === "cargo")      setFilterCargos([]);
    if (filterId === "time")       setFilterTeamIds([]);
  }

  function clearAllSearchFilters() {
    setSearchActiveFilters([]);
    setFilterMembership("all");
    setFilterRole("all");
    setFilterCargos([]);
    setFilterTeamIds([]);
  }

  /* ——— Save / Close ——— */

  function handleSave() {
    if (!formName.trim()) {
      toast.error("Nome do time é obrigatório");
      if (activeTab !== "details") setActiveTab("details");
      return;
    }

    if (pendingMembers.length > 0 && !pendingMembers.some((m) => m.roleInTeam === "leader")) {
      toast.error("O time precisa ter pelo menos um líder");
      if (activeTab !== "members") setActiveTab("members");
      return;
    }

    onSave({
      name: formName.trim(),
      description: formDesc.trim(),
      color: formColor,
      members: pendingMembers,
    });
  }

  function handleClose() {
    if (hasChanges && !window.confirm("Você tem alterações não salvas. Deseja descartar?")) return;
    onClose();
  }

  /* ——— Tab definitions ——— */

  const mainTabs = [
    { value: "details", label: "Detalhes" },
    {
      value: "members",
      label: "Membros",
      badge: pendingMembers.length > 0 ? (
        <Badge color={hasMembersChanges ? "orange" : "neutral"} size="sm">
          {pendingMembers.length}
        </Badge>
      ) : undefined,
    },
  ];

  /* ——— Details panel ——— */

  const detailsPanel = (
    <div className={styles.formStack}>
      <Input
        label="Nome do time"
        placeholder="Ex: Engenharia, Produto..."
        value={formName}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
      />
      <Textarea
        label="Descrição"
        placeholder="Descreva o propósito deste time..."
        value={formDesc}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormDesc(e.target.value)}
        rows={3}
      />
      <div className={styles.formField}>
        <span className={styles.formLabel}>Cor do badge</span>
        <div className={styles.colorGrid}>
          {COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.colorOption} ${formColor === opt.value ? styles.colorOptionActive : ""}`}
              onClick={() => setFormColor(opt.value)}
            >
              <Badge color={opt.value} size="sm">{opt.label}</Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ——— Search panel (main body in members tab) ——— */

  const searchPanel = (
    <div className={styles.searchPanel}>
      <Input
        ref={searchInputRef}
        placeholder="Buscar por nome ou cargo..."
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        leftIcon={MagnifyingGlass}
      />

      <div className={styles.filterBarWrapper}>
        <FilterBar
          filters={SEARCH_FILTERS.filter((f) => !searchActiveFilters.includes(f.id))}
          onAddFilter={(id: string) => {
            setSearchActiveFilters((prev) => [...prev, id]);
            requestAnimationFrame(() => setSearchOpenFilter(id));
          }}
          onClearAll={searchActiveFilters.length > 0 ? clearAllSearchFilters : undefined}
        >
          {searchActiveFilters.map((filterId) => (
            <div
              key={filterId}
              ref={
                filterId === "membership" ? membershipChipRef
                : filterId === "role"     ? roleChipRef
                : filterId === "cargo"    ? cargoChipRef
                : filterId === "time"     ? timeChipRef
                : undefined
              }
              style={{ display: "inline-flex" }}
            >
              <FilterChip
                label={getSearchFilterLabel(filterId)}
                active={searchOpenFilter === filterId}
                onClick={() => setSearchOpenFilter(searchOpenFilter === filterId ? null : filterId)}
                onRemove={() => removeSearchFilter(filterId)}
              />
            </div>
          ))}
        </FilterBar>
      </div>

      {/* FilterDropdowns */}

      {/* Situação */}
      <FilterDropdown
        open={searchOpenFilter === "membership"}
        onClose={() => setSearchOpenFilter(null)}
        anchorRef={membershipChipRef}
      >
        <div className={styles.filterDropdownBody}>
          {MEMBERSHIP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.filterActionItem} ${filterMembership === opt.id ? styles.filterActionItemActive : ""}`}
              onClick={() => { setFilterMembership(opt.id); setSearchOpenFilter(null); }}
            >
              <Radio checked={filterMembership === opt.id} readOnly />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Papel */}
      <FilterDropdown
        open={searchOpenFilter === "role"}
        onClose={() => setSearchOpenFilter(null)}
        anchorRef={roleChipRef}
      >
        <div className={styles.filterDropdownBody}>
          <button
            type="button"
            className={`${styles.filterActionItem} ${filterRole === "all" ? styles.filterActionItemActive : ""}`}
            onClick={() => { setFilterRole("all"); setSearchOpenFilter(null); }}
          >
            <Radio checked={filterRole === "all"} readOnly />
            <span>Todos os papéis</span>
          </button>
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.filterActionItem} ${filterRole === opt.id ? styles.filterActionItemActive : ""}`}
              onClick={() => { setFilterRole(opt.id); setSearchOpenFilter(null); }}
            >
              <Radio checked={filterRole === opt.id} readOnly />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Cargo (multi-select com Checkbox) */}
      <FilterDropdown
        open={searchOpenFilter === "cargo"}
        onClose={() => setSearchOpenFilter(null)}
        anchorRef={cargoChipRef}
      >
        <div className={styles.filterDropdownBody}>
          {cargoOptions.map((cargo) => (
            <button
              key={cargo}
              type="button"
              className={`${styles.filterActionItem} ${filterCargos.includes(cargo) ? styles.filterActionItemActive : ""}`}
              onClick={() => handleToggleCargoFilter(cargo)}
            >
              <Checkbox size="sm" checked={filterCargos.includes(cargo)} readOnly tabIndex={-1} aria-hidden />
              <span>{cargo}</span>
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Time (multi-select com Checkbox) */}
      <FilterDropdown
        open={searchOpenFilter === "time"}
        onClose={() => setSearchOpenFilter(null)}
        anchorRef={timeChipRef}
      >
        <div className={styles.filterDropdownBody}>
          {teamOptions.length === 0 ? (
            <div className={styles.filterDropdownEmpty}>Nenhum outro time disponível</div>
          ) : (
            teamOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.filterActionItem} ${filterTeamIds.includes(t.id) ? styles.filterActionItemActive : ""}`}
                onClick={() => handleToggleTeamFilter(t.id)}
              >
                <Checkbox size="sm" checked={filterTeamIds.includes(t.id)} readOnly tabIndex={-1} aria-hidden />
                <span>{t.name}</span>
              </button>
            ))
          )}
        </div>
      </FilterDropdown>

      {/* Lista de pessoas */}
      <div className={styles.personList} role="listbox" aria-label="Pessoas disponíveis">
        {searchResults.length === 0 ? (
          <div className={styles.emptySearch}>
            <MagnifyingGlass size={20} />
            <span>
              {search
                ? `Nenhuma pessoa encontrada para "${search}"`
                : "Nenhuma pessoa corresponde aos filtros"}
            </span>
          </div>
        ) : (
          searchResults.map((person) => {
            const isSelected = pendingIds.has(person.id);
            return (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.personRow} ${isSelected ? styles.personRowSelected : ""}`}
                onClick={() => handleTogglePerson(person)}
              >
                <Checkbox size="sm" checked={isSelected} readOnly tabIndex={-1} aria-hidden />
                <AvatarLabelGroup
                  size="sm"
                  initials={person.initials}
                  name={`${person.firstName} ${person.lastName}`}
                  supportingText={person.jobTitle}
                />
              </button>
            );
          })
        )}
      </div>

      <div className={styles.listCount}>
        {searchResults.length} de {peoplePool.length} pessoas
        {pendingMembers.length > 0 && ` · ${pendingMembers.length} no time`}
      </div>
    </div>
  );

  /* ——— Members panel (sidePanel do Modal) ——— */

  const membersPanel = (
    <div className={styles.membersPanel}>
      <div className={styles.membersPanelHeader}>
        <span className={styles.membersPanelTitle}>Membros atuais</span>
        <Badge color="neutral" size="sm">{pendingMembers.length}</Badge>
      </div>

      <div className={styles.membersPanelFilter}>
        <FilterBar
          filters={MEMBERS_FILTERS.filter((f) => !membersActiveFilters.includes(f.id))}
          onAddFilter={(id: string) => {
            setMembersActiveFilters((prev) => [...prev, id]);
            requestAnimationFrame(() => setMembersOpenFilter(id));
          }}
          onClearAll={
            membersActiveFilters.length > 0
              ? () => { setMembersActiveFilters([]); setFilterMembersRole("all"); }
              : undefined
          }
        >
          {membersActiveFilters.map((filterId) => (
            <div
              key={filterId}
              ref={filterId === "role" ? membersRoleChipRef : undefined}
              style={{ display: "inline-flex" }}
            >
              <FilterChip
                label={getMembersFilterLabel(filterId)}
                active={membersOpenFilter === filterId}
                onClick={() => setMembersOpenFilter(membersOpenFilter === filterId ? null : filterId)}
                onRemove={() => {
                  setMembersActiveFilters((prev) => prev.filter((f) => f !== filterId));
                  if (filterId === "role") setFilterMembersRole("all");
                }}
              />
            </div>
          ))}
        </FilterBar>
      </div>

      <FilterDropdown
        open={membersOpenFilter === "role"}
        onClose={() => setMembersOpenFilter(null)}
        anchorRef={membersRoleChipRef}
      >
        <div className={styles.filterDropdownBody}>
          <button
            type="button"
            className={`${styles.filterActionItem} ${filterMembersRole === "all" ? styles.filterActionItemActive : ""}`}
            onClick={() => { setFilterMembersRole("all"); setMembersOpenFilter(null); }}
          >
            <Radio checked={filterMembersRole === "all"} readOnly />
            <span>Todos os papéis</span>
          </button>
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.filterActionItem} ${filterMembersRole === opt.id ? styles.filterActionItemActive : ""}`}
              onClick={() => { setFilterMembersRole(opt.id); setMembersOpenFilter(null); }}
            >
              <Radio checked={filterMembersRole === opt.id} readOnly />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </FilterDropdown>

      <div className={styles.membersList}>
        {pendingMembers.length === 0 ? (
          <div className={styles.emptyMembers}>
            <UsersThree size={28} />
            <span>Nenhum membro ainda</span>
            <span className={styles.emptyHint}>Selecione pessoas na busca ao lado</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className={styles.emptyMembers}>
            <UsersThree size={28} />
            <span>Nenhum membro com esse papel</span>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isNew = addedIds.has(member.userId);
            return (
              <div key={member.userId} className={styles.memberRow}>
                <AvatarLabelGroup
                  size="sm"
                  initials={member.user?.initials ?? ""}
                  name={`${member.user?.firstName ?? ""} ${member.user?.lastName ?? ""}`}
                  supportingText={member.user?.jobTitle ?? ""}
                />
                <div className={styles.memberRowRight}>
                  {isNew && <Badge color="success" size="sm">Novo</Badge>}

                  <button
                    ref={(el: HTMLButtonElement | null) => { roleButtonRefs.current[member.userId] = el; }}
                    type="button"
                    className={`${styles.roleBadgeBtn} ${openRoleFor === member.userId ? styles.roleBadgeBtnOpen : ""}`}
                    onClick={() => setOpenRoleFor(openRoleFor === member.userId ? null : member.userId)}
                    title="Alterar papel no time"
                    aria-haspopup="listbox"
                    aria-expanded={openRoleFor === member.userId}
                  >
                    <Badge
                      color={ROLE_BADGE_COLOR[member.roleInTeam]}
                      size="sm"
                      rightIcon={CaretDown}
                    >
                      {ROLE_LABEL[member.roleInTeam]}
                    </Badge>
                  </button>

                  <FilterDropdown
                    open={openRoleFor === member.userId}
                    onClose={() => setOpenRoleFor(null)}
                    anchorRef={{ current: roleButtonRefs.current[member.userId] ?? null }}
                    noOverlay
                  >
                    <div className={styles.filterDropdownBody}>
                      {ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`${styles.filterActionItem} ${member.roleInTeam === opt.id ? styles.filterActionItemActive : ""}`}
                          onClick={() => handleChangeRole(member.userId, opt.id)}
                        >
                          <Radio checked={member.roleInTeam === opt.id} readOnly />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </FilterDropdown>

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemoveMember(member.userId)}
                    aria-label={`Remover ${member.user?.firstName ?? "membro"} do time`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  /* ——— Mobile sub-tabs for members ——— */

  const mobileMembersTabs = [
    { value: "add", label: "Adicionar" },
    {
      value: "members",
      label: "Membros",
      badge: pendingMembers.length > 0 ? (
        <Badge color={hasMembersChanges ? "orange" : "neutral"} size="sm">
          {pendingMembers.length}
        </Badge>
      ) : undefined,
    },
  ];

  /* ——— Title ——— */

  const title = isCreating ? "Novo time" : team.name;

  /* ——— sidePanel only visible on members tab ——— */

  const showSidePanel = activeTab === "members";

  return (
    <Modal open={open} onClose={handleClose} size="lg" sidePanel={showSidePanel ? membersPanel : null}>
      <ModalHeader title={title} onClose={handleClose}>
        {hasChanges && <Badge color="orange" size="sm">Alterado</Badge>}
      </ModalHeader>

      {/* Main tabs */}
      <div className={styles.tabBarWrapper}>
        <TabBar
          tabs={mainTabs}
          activeTab={activeTab}
          onTabChange={(v: string) => setActiveTab(v as "details" | "members")}
          id="team-modal"
        />
      </div>

      {/* Mobile sub-tabs (only within members tab, only on mobile) */}
      {activeTab === "members" && (
        <div className={styles.mobileMembersTabs}>
          <TabBar
            tabs={mobileMembersTabs}
            activeTab={mobileMembersTab}
            onTabChange={(v: string) => setMobileMembersTab(v as "add" | "members")}
            id="team-modal-members"
          />
        </div>
      )}

      <ModalBody>
        {activeTab === "details" && detailsPanel}
        {activeTab === "members" && (
          <>
            {/* Desktop: search panel (sidePanel handles members) */}
            <div className={styles.desktopPanel}>{searchPanel}</div>
            {/* Mobile: toggle between search and members */}
            <div className={styles.mobilePanel}>
              {mobileMembersTab === "add" ? searchPanel : membersPanel}
            </div>
          </>
        )}
      </ModalBody>

      <ModalFooter align="between">
        <span className={styles.footerInfo}>
          {pendingMembers.length} membro{pendingMembers.length !== 1 ? "s" : ""}
          {hasChanges ? " · alterações pendentes" : ""}
        </span>
        <div className={styles.footerActions}>
          <Button variant="secondary" size="md" onClick={handleClose}>Cancelar</Button>
          <Button variant="primary" size="md" onClick={handleSave}>
            {isCreating ? "Criar time" : "Salvar"}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
});
