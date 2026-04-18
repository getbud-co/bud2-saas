import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  type ChangeEvent,
  type MouseEvent,
  type TouchEvent,
  type WheelEvent,
} from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Badge,
  Avatar,
  toast,
  FilterBar,
  FilterChip,
  FilterDropdown,
  Checkbox,
  Drawer,
  DrawerHeader,
  DrawerBody,
} from "@getbud-co/buds";
import {
  MagnifyingGlass,
  Plus,
  Minus,
  CaretDown,
  CaretRight,
  UsersThree,
  Warning,
  X,
  PencilSimple,
  UserCirclePlus,
  ArrowBendDownRight,
  ListBullets,
  TreeStructure,
  ArrowsOutSimple,
  ArrowsInSimple,
} from "@phosphor-icons/react";
import { usePeopleData, type OrgPersonView } from "@/contexts/PeopleDataContext";
import styles from "./OrgChartModule.module.css";

const TEAM_COLORS: Record<string, "neutral" | "orange" | "wine" | "caramel" | "success" | "warning" | "error"> = {
  Executivo: "wine",
  Engenharia: "orange",
  Produto: "caramel",
  Design: "success",
  RH: "neutral",
  Marketing: "warning",
};

/* ——— Tree helpers ——— */

interface TreeNode extends OrgPersonView {
  children: TreeNode[];
}

function buildTree(people: OrgPersonView[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const p of people) map.set(p.id, { ...p, children: [] });
  for (const node of map.values()) {
    if (node.managerId && map.has(node.managerId)) {
      map.get(node.managerId)!.children.push(node);
    } else if (!node.managerId) {
      roots.push(node);
    }
  }
  return roots;
}

function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) count += countDescendants(child);
  return count;
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(n: TreeNode) { result.push(n); n.children.forEach(walk); }
  nodes.forEach(walk);
  return result;
}

function getDescendantIds(node: TreeNode): Set<string> {
  const ids = new Set<string>();
  function walk(n: TreeNode) { ids.add(n.id); n.children.forEach(walk); }
  walk(node);
  return ids;
}

/* ——— Person picker sub-component ——— */

function PersonPicker({
  people,
  excludeIds,
  onSelect,
  onCancel,
  placeholder = "Buscar colaborador...",
}: {
  people: OrgPersonView[];
  excludeIds: Set<string>;
  onSelect: (id: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return people
      .filter((p) => !excludeIds.has(p.id))
      .filter((p) =>
        !q || `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || (p.jobTitle ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [people, excludeIds, query]);

  return (
    <div className={styles.picker}>
      <div className={styles.pickerInputRow}>
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          leftIcon={MagnifyingGlass}
        />
        <button type="button" className={styles.pickerCancel} onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
      <div className={styles.pickerResults}>
        {filtered.length === 0 && (
          <div className={styles.pickerEmpty}>Nenhum resultado</div>
        )}
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.pickerItem}
            onClick={() => onSelect(p.id)}
          >
            <Avatar initials={p.initials ?? undefined} size="sm" />
            <div className={styles.pickerItemInfo}>
              <span className={styles.pickerItemName}>{p.firstName} {p.lastName}</span>
              <span className={styles.pickerItemTitle}>{p.jobTitle} · {p.teams.join(", ")}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ——— Main component ——— */

export function OrgChartModule() {
  const { orgPeople: people, setOrgPeople, teamNameOptions } = usePeopleData();
  const teamOptions = useMemo(() => {
    if (teamNameOptions.length > 0) return teamNameOptions;
    return Array.from(new Set(people.flatMap((person) => person.teams))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [teamNameOptions, people]);
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ceo", "cto", "cpo", "chro", "cmo"]));
  const [zoom, setZoom] = useState(100);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "chart">("chart");

  /* pan state for chart view */
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const isPanning = useRef(false);
  const didPan = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  /* detail panel */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingManager, setEditingManager] = useState(false);
  const [addingReport, setAddingReport] = useState(false);
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const teamBtnRef = useRef<HTMLButtonElement>(null);

  /* close panel */
  function closePanel() {
    setSelectedId(null);
    setEditingManager(false);
    setAddingReport(false);
    setEditingTeam(false);
  }

  /* filter state */
  const [filterTeamOpen, setFilterTeamOpen] = useState(false);
  const filterTeamRef = useRef<HTMLDivElement>(null);

  /* view mode dropdown */
  const [viewModeOpen, setViewModeOpen] = useState(false);
  const viewModeBtnRef = useRef<HTMLButtonElement>(null);

  /* derived */
  const tree = useMemo(() => buildTree(people), [people]);
  const allFlat = useMemo(() => flattenTree(tree), [tree]);

  const selectedPerson = useMemo(
    () => (selectedId ? people.find((p) => p.id === selectedId) ?? null : null),
    [people, selectedId],
  );

  const selectedNode = useMemo(
    () => (selectedId ? allFlat.find((n) => n.id === selectedId) ?? null : null),
    [allFlat, selectedId],
  );

  const selectedManager = useMemo(
    () => (selectedPerson?.managerId ? people.find((p) => p.id === selectedPerson.managerId) ?? null : null),
    [people, selectedPerson],
  );

  const selectedReports = useMemo(
    () => (selectedId ? people.filter((p) => p.managerId === selectedId) : []),
    [people, selectedId],
  );

  const managerChain = useMemo(() => {
    if (!selectedPerson) return [];
    const chain: OrgPersonView[] = [];
    let current = selectedPerson;
    while (current.managerId) {
      const mgr = people.find((p) => p.id === current.managerId);
      if (!mgr) break;
      chain.push(mgr);
      current = mgr;
    }
    return chain.reverse();
  }, [people, selectedPerson]);

  /* search results */
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return people.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.jobTitle ?? "").toLowerCase().includes(q) ||
        p.teams.some((t) => t.toLowerCase().includes(q))
    );
  }, [people, search]);

  /* unassigned */
  const unassigned = useMemo(() => {
    const ids = new Set(people.map((p) => p.id));
    return people.filter((p) => p.managerId !== null && !ids.has(p.managerId));
  }, [people]);

  /* expand / collapse */
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(people.filter((p) => people.some((c) => c.managerId === p.id)).map((p) => p.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  /* zoom */
  function zoomIn() { setZoom((z) => Math.min(z + 10, 150)); }
  function zoomOut() { setZoom((z) => Math.max(z - 10, 50)); }
  function zoomReset() { setZoom(100); setPanOffset({ x: 0, y: 0 }); }

  /* pan (drag to navigate) — mouse */
  function handlePanStart(e: MouseEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input")) return;

    isPanning.current = true;
    didPan.current = false;
    setIsDragging(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    panOffsetStart.current = { ...panOffset };
    e.preventDefault();
  }

  function handlePanMove(e: MouseEvent) {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
    setPanOffset({
      x: panOffsetStart.current.x + dx,
      y: panOffsetStart.current.y + dy,
    });
  }

  function handlePanEnd() {
    isPanning.current = false;
    setIsDragging(false);
  }

  /* pan — touch (mobile) */
  const lastTouchDist = useRef<number | null>(null);

  function handleTouchStart(e: TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input")) return;

    if (e.touches.length === 1) {
      const touch = e.touches.item(0);
      if (!touch) return;
      isPanning.current = true;
      didPan.current = false;
      setIsDragging(true);
      panStart.current = { x: touch.clientX, y: touch.clientY };
      panOffsetStart.current = { ...panOffset };
    } else if (e.touches.length === 2) {
      /* pinch-to-zoom start */
      const firstTouch = e.touches.item(0);
      const secondTouch = e.touches.item(1);
      if (!firstTouch || !secondTouch) return;
      const dx = firstTouch.clientX - secondTouch.clientX;
      const dy = firstTouch.clientY - secondTouch.clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 1 && isPanning.current) {
      const touch = e.touches.item(0);
      if (!touch) return;
      const dx = touch.clientX - panStart.current.x;
      const dy = touch.clientY - panStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
      setPanOffset({
        x: panOffsetStart.current.x + dx,
        y: panOffsetStart.current.y + dy,
      });
      e.preventDefault();
    } else if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const firstTouch = e.touches.item(0);
      const secondTouch = e.touches.item(1);
      if (!firstTouch || !secondTouch) return;
      const dx = firstTouch.clientX - secondTouch.clientX;
      const dy = firstTouch.clientY - secondTouch.clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist - lastTouchDist.current;
      if (Math.abs(delta) > 2) {
        setZoom((z) => Math.min(Math.max(z + (delta > 0 ? 3 : -3), 50), 150));
        lastTouchDist.current = dist;
      }
      e.preventDefault();
    }
  }

  function handleTouchEnd() {
    isPanning.current = false;
    setIsDragging(false);
    lastTouchDist.current = null;
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setZoom((z) => Math.min(Math.max(z + delta, 50), 150));
    }
  }

  /* select / navigate */
  function selectPerson(id: string) {
    if (didPan.current) return;
    setSelectedId(id);
    setEditingManager(false);
    setAddingReport(false);
    setEditingTeam(false);

    /* expand ancestors so the person is visible */
    const ancestorIds: string[] = [];
    let current = people.find((p) => p.id === id);
    while (current?.managerId) {
      ancestorIds.push(current.managerId);
      current = people.find((p) => p.id === current!.managerId);
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      ancestorIds.forEach((aid) => next.add(aid));
      return next;
    });

    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 2000);
  }

  function handleSearchSelect(id: string) {
    selectPerson(id);
    setSearch("");
  }

  /* ——— Edit actions ——— */

  function handleChangeManager(newManagerId: string) {
    if (!selectedPerson) return;

    if (newManagerId === selectedPerson.id) {
      toast.error("Não pode reportar a si mesmo");
      return;
    }

    if (selectedNode) {
      const descIds = getDescendantIds(selectedNode);
      if (descIds.has(newManagerId)) {
        toast.error("Não é possível reportar a um liderado próprio (referência circular)");
        return;
      }
    }

    const managerName = people.find((p) => p.id === newManagerId);
    setOrgPeople((prev) => prev.map((p) => p.id === selectedPerson.id ? { ...p, managerId: newManagerId } : p));
    setEditingManager(false);
    toast.success(`${selectedPerson.firstName} agora reporta a ${managerName?.firstName ?? "?"}`);
  }

  function handleRemoveManager() {
    if (!selectedPerson) return;
    setOrgPeople((prev) => prev.map((p) => p.id === selectedPerson.id ? { ...p, managerId: null } : p));
    toast.success(`${selectedPerson.firstName} movido para o nível mais alto`);
  }

  function handleAddReport(reportId: string) {
    if (!selectedPerson) return;
    const reportPerson = people.find((p) => p.id === reportId);
    setOrgPeople((prev) => prev.map((p) => p.id === reportId ? { ...p, managerId: selectedPerson.id } : p));

    /* expand this node so the new report is visible */
    setExpanded((prev) => new Set([...prev, selectedPerson.id]));
    setAddingReport(false);
    toast.success(`${reportPerson?.firstName ?? "?"} agora reporta a ${selectedPerson.firstName}`);
  }

  function handleToggleTeam(team: string) {
    if (!selectedPerson) return;
    const has = selectedPerson.teams.includes(team);
    if (has && selectedPerson.teams.length === 1) {
      toast.error("A pessoa deve pertencer a pelo menos um time");
      return;
    }
    const newTeams = has
      ? selectedPerson.teams.filter((t) => t !== team)
      : [...selectedPerson.teams, team];
    setOrgPeople((prev) => prev.map((p) => p.id === selectedPerson.id ? { ...p, teams: newTeams } : p));
    toast.success(has ? `${selectedPerson.firstName} removido de ${team}` : `${selectedPerson.firstName} adicionado a ${team}`);
  }

  function closeTeamPicker() {
    setEditingTeam(false);
    setTeamSearch("");
  }

  const filteredTeams = useMemo(() => {
    if (!teamSearch.trim()) return teamOptions;
    const q = teamSearch.toLowerCase();
    return teamOptions.filter((t) => t.toLowerCase().includes(q));
  }, [teamSearch, teamOptions]);

  const canCreateTeam = teamSearch.trim().length > 0 && !teamOptions.some((t) => t.toLowerCase() === teamSearch.trim().toLowerCase());

  function handleCreateTeam() {
    const name = teamSearch.trim();
    if (!name || !canCreateTeam || !selectedPerson) return;
    setOrgPeople((prev) => prev.map((p) => p.id === selectedPerson.id ? { ...p, teams: [...p.teams, name] } : p));
    setTeamSearch("");
    toast.success(`Time "${name}" criado e atribuído a ${selectedPerson.firstName}`);
  }

  function handleRemoveReport(reportId: string) {
    const reportPerson = people.find((p) => p.id === reportId);
    setOrgPeople((prev) => prev.map((p) => p.id === reportId ? { ...p, managerId: null } : p));
    toast.success(`${reportPerson?.firstName ?? "?"} removido dos liderados`);
  }

  /* filter handlers */
  function handleFilterTeam(team: string) {
    setFilterTeam(team);
    setFilterTeamOpen(false);
  }

  function clearFilters() {
    setFilterTeam("all");
  }

  /* picker exclude sets */
  const managerExcludeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return getDescendantIds(selectedNode);
  }, [selectedNode]);

  const reportExcludeIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const ids = new Set<string>([selectedId]);
    /* exclude people already reporting to this person */
    for (const p of people) {
      if (p.managerId === selectedId) ids.add(p.id);
    }
    return ids;
  }, [people, selectedId]);

  /* ——— Render tree node ——— */
  const renderNode = useCallback(
    (node: TreeNode, depth: number) => {
      if (filterTeam !== "all") {
        function hasTeamMatch(n: TreeNode): boolean {
          if (n.teams.includes(filterTeam)) return true;
          return n.children.some(hasTeamMatch);
        }
        if (!hasTeamMatch(node)) return null;
      }

      const hasChildren = node.children.length > 0;
      const isExpanded = expanded.has(node.id);
      const directReports = node.children.length;
      const totalReports = countDescendants(node);
      const isHighlighted = highlightId === node.id;
      const isSelected = selectedId === node.id;
      const primaryTeam = node.teams[0] ?? "Sem time";

      return (
        <div key={node.id} className={styles.nodeGroup}>
          <div
            className={`${styles.node} ${isHighlighted ? styles.nodeHighlighted : ""} ${isSelected ? styles.nodeSelected : ""} ${depth === 0 ? styles.nodeRoot : ""}`}
            onClick={() => selectPerson(node.id)}
          >
            <div className={styles.nodeMain}>
              {hasChildren ? (
                <button
                  type="button"
                  className={styles.expandBtn}
                  onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                >
                  {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                </button>
              ) : (
                <span className={styles.expandBtnSpacer} />
              )}
              <Avatar initials={node.initials ?? undefined} size="sm" />
              <div className={styles.nodeInfo}>
                <span className={styles.nodeName}>{node.firstName} {node.lastName}</span>
                <span className={styles.nodeTitle}>{node.jobTitle}</span>
              </div>
              <div className={styles.nodeRight}>
                <Badge color={TEAM_COLORS[primaryTeam] ?? "neutral"} size="sm">{primaryTeam}</Badge>
                {node.teams.length > 1 && <span className={styles.teamOverflow}>+{node.teams.length - 1}</span>}
                {node.status === "inactive" && <Badge color="neutral" size="sm">Inativo</Badge>}
                {directReports > 0 && (
                  <span className={styles.reportsCount} title={`${totalReports} no total`}>
                    <UsersThree size={14} />
                    {directReports}
                  </span>
                )}
              </div>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className={styles.childrenGroup}>
              <div className={styles.treeLine} />
              <div className={styles.childrenList}>
                {node.children.map((child) => renderNode(child, depth + 1))}
              </div>
            </div>
          )}
        </div>
      );
    },
    [expanded, highlightId, filterTeam, selectedId],
  );

  /* ——— Render chart node (tree diagram view) ——— */
  const renderChartNode = useCallback(
    (node: TreeNode) => {
      if (filterTeam !== "all") {
        function hasTeamMatch(n: TreeNode): boolean {
          if (n.teams.includes(filterTeam)) return true;
          return n.children.some(hasTeamMatch);
        }
        if (!hasTeamMatch(node)) return null;
      }

      const hasChildren = node.children.length > 0;
      const isExpanded = expanded.has(node.id);
      const isHighlighted = highlightId === node.id;
      const isSelected = selectedId === node.id;
      const directReports = node.children.length;
      const primaryTeam = node.teams[0] ?? "Sem time";

      const visibleChildren = hasChildren && isExpanded
        ? node.children.map((child) => renderChartNode(child)).filter(Boolean)
        : [];

      return (
        <div key={node.id} className={styles.chartNodeGroup}>
          <div
            className={`${styles.chartCard} ${isSelected ? styles.chartCardSelected : ""} ${isHighlighted ? styles.chartCardHighlighted : ""}`}
            onClick={() => selectPerson(node.id)}
          >
            <Avatar initials={node.initials ?? undefined} size="md" />
            <span className={styles.chartCardName}>{node.firstName} {node.lastName}</span>
            <span className={styles.chartCardTitle}>{node.jobTitle}</span>
            <div className={styles.chartCardMeta}>
              <Badge color={TEAM_COLORS[primaryTeam] ?? "neutral"} size="sm">{primaryTeam}</Badge>
              {node.teams.length > 1 && <span className={styles.teamOverflow}>+{node.teams.length - 1}</span>}
            </div>
            {hasChildren && (
              <button
                type="button"
                className={styles.chartExpandBtn}
                onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              >
                {isExpanded ? <Minus size={12} /> : <span>{directReports}</span>}
              </button>
            )}
          </div>

          {visibleChildren.length > 0 && (
            <div className={styles.chartChildrenWrap}>
              <div className={`${styles.chartChildren} ${visibleChildren.length === 1 ? styles.chartChildrenSingle : ""}`}>
                {visibleChildren}
              </div>
            </div>
          )}
        </div>
      );
    },
    [expanded, highlightId, filterTeam, selectedId],
  );

  /* stats */
  const totalActive = people.filter((p) => p.status === "active").length;
  const totalTeams = new Set(people.flatMap((p) => p.teams)).size;

  return (
    <>
      {/* Toolbar */}
      <Card>
        <CardBody>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar colaborador..."
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  leftIcon={MagnifyingGlass}
                />
                {searchResults.length > 0 && search.trim() && (
                  <div className={styles.searchDropdown}>
                    {searchResults.slice(0, 8).map((p) => (
                      <button key={p.id} type="button" className={styles.searchResult} onClick={() => handleSearchSelect(p.id)}>
                        <Avatar initials={p.initials ?? undefined} size="sm" />
                        <div className={styles.searchResultInfo}>
                          <span className={styles.searchResultName}>{p.firstName} {p.lastName}</span>
                          <span className={styles.searchResultTitle}>{p.jobTitle} · {p.teams.join(", ")}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.stats}>
                <Badge color="neutral">{totalActive} ativos</Badge>
                <Badge color="neutral">{totalTeams} times</Badge>
                {unassigned.length > 0 && (
                  <Badge color="error" leftIcon={Warning}>{unassigned.length} sem gestor</Badge>
                )}
              </div>
            </div>
            <div className={styles.toolbarRight}>
              <Button
                ref={viewModeBtnRef}
                variant="secondary"
                size="md"
                leftIcon={viewMode === "chart" ? TreeStructure : ListBullets}
                rightIcon={CaretDown}
                onClick={() => setViewModeOpen((v) => !v)}
              >
                {viewMode === "chart" ? "Vendo em árvore" : "Vendo em lista"}
              </Button>
              <FilterDropdown
                open={viewModeOpen}
                onClose={() => setViewModeOpen(false)}
                anchorRef={viewModeBtnRef}
                noOverlay
              >
                <div className={styles.filterDropdownBody}>
                  {([
                    { id: "chart", label: "Árvore", icon: TreeStructure },
                    { id: "list", label: "Lista", icon: ListBullets },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`${styles.filterDropdownItem} ${viewMode === opt.id ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => {
                        setViewMode(opt.id);
                        setViewModeOpen(false);
                      }}
                    >
                      <opt.icon size={14} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </FilterDropdown>
              <Button variant="secondary" size="md" leftIcon={ArrowsOutSimple} onClick={expandAll}>Expandir tudo</Button>
              <Button variant="secondary" size="md" leftIcon={ArrowsInSimple} onClick={collapseAll}>Recolher tudo</Button>
              <div className={styles.zoomControls}>
                <Button variant="secondary" size="md" leftIcon={Minus} onClick={zoomOut} />
                <button type="button" className={styles.zoomLabel} onClick={zoomReset}>{zoom}%</button>
                <Button variant="secondary" size="md" leftIcon={Plus} onClick={zoomIn} />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      <FilterBar
        filters={filterTeam === "all" ? [{ id: "team", label: "Time", icon: UsersThree }] : []}
        onAddFilter={(id: string) => {
          if (id === "team") {
            const firstTeam = teamOptions[0];
            if (!firstTeam) return;
            setFilterTeam(firstTeam);
            requestAnimationFrame(() => setFilterTeamOpen(true));
          }
        }}
        onClearAll={filterTeam !== "all" ? clearFilters : undefined}
      >
        {filterTeam !== "all" && (
          <div ref={filterTeamRef} style={{ display: "inline-flex" }}>
            <FilterChip
              label={`Time: ${filterTeam}`}
              active={filterTeamOpen}
              onClick={() => setFilterTeamOpen((v) => !v)}
              onRemove={() => setFilterTeam("all")}
            />
          </div>
        )}
      </FilterBar>
      <FilterDropdown
        open={filterTeamOpen}
        onClose={() => setFilterTeamOpen(false)}
        anchorRef={filterTeamRef}
      >
        <div className={styles.filterDropdownBody}>
          <button type="button" className={`${styles.filterDropdownItem} ${filterTeam === "all" ? styles.filterDropdownItemActive : ""}`} onClick={() => handleFilterTeam("all")}>
            Todos os times
          </button>
          {teamOptions.map((t) => (
            <button key={t} type="button" className={`${styles.filterDropdownItem} ${filterTeam === t ? styles.filterDropdownItemActive : ""}`} onClick={() => handleFilterTeam(t)}>
              <Badge color={TEAM_COLORS[t] ?? "neutral"} size="sm">{t}</Badge>
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Tree + Detail panel */}
      <div className={styles.mainArea}>
        {/* Tree */}
        <Card padding="none" className={styles.treeCard}>
          {viewMode === "list" ? (
            <div className={styles.treeWrapper} style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}>
              <div className={styles.tree}>
                {tree.map((root) => renderNode(root, 0))}

                {unassigned.length > 0 && (
                  <div className={styles.unassignedSection}>
                    <div className={styles.unassignedHeader}>
                      <Warning size={16} />
                      <span>Sem gestor atribuído ({unassigned.length})</span>
                    </div>
                    {unassigned.map((p) => (
                      <div
                        key={p.id}
                        className={`${styles.node} ${selectedId === p.id ? styles.nodeSelected : ""}`}
                        onClick={() => selectPerson(p.id)}
                      >
                        <div className={styles.nodeMain}>
                          <span className={styles.expandBtnSpacer} />
                          <Avatar initials={p.initials ?? undefined} size="sm" />
                          <div className={styles.nodeInfo}>
                            <span className={styles.nodeName}>{p.firstName} {p.lastName}</span>
                            <span className={styles.nodeTitle}>{p.jobTitle}</span>
                          </div>
                          <div className={styles.nodeRight}>
                            <Badge color={TEAM_COLORS[p.teams[0] ?? "Sem time"] ?? "neutral"} size="sm">{p.teams[0] ?? "Sem time"}</Badge>
                            {p.teams.length > 1 && <span className={styles.teamOverflow}>+{p.teams.length - 1}</span>}
                            <Badge color="error" size="sm">Sem gestor</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              ref={chartContainerRef}
              className={`${styles.chartWrapper} ${isDragging ? styles.chartWrapperGrabbing : ""}`}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              <div
                className={styles.chartTree}
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                  transformOrigin: "top center",
                }}
              >
                {tree.map((root) => renderChartNode(root))}
              </div>
            </div>
          )}
        </Card>

      </div>

      {/* Detail drawer */}
      <Drawer open={!!selectedPerson} onClose={closePanel} size="sm">
        {selectedPerson && (
          <>
            <DrawerHeader
              title={`${selectedPerson.firstName} ${selectedPerson.lastName}`}
              onClose={closePanel}
              afterTitle={
                <div className={styles.panelPerson}>
                  <Avatar initials={selectedPerson.initials ?? undefined} size="lg" />
                  <div className={styles.panelPersonInfo}>
                    <span className={styles.panelPersonName}>{selectedPerson.firstName} {selectedPerson.lastName}</span>
                    <span className={styles.panelPersonTitle}>{selectedPerson.jobTitle}</span>
                    <div className={styles.panelPersonMeta}>
                      {selectedPerson.teams.slice(0, 2).map((t) => (
                        <Badge key={t} color={TEAM_COLORS[t] ?? "neutral"} size="sm">{t}</Badge>
                      ))}
                      {selectedPerson.teams.length > 2 && <span className={styles.teamOverflow}>+{selectedPerson.teams.length - 2}</span>}
                      {selectedPerson.status === "inactive" && <Badge color="neutral" size="sm">Inativo</Badge>}
                    </div>
                  </div>
                </div>
              }
            />

            <DrawerBody>
              {/* Time */}
              <div className={styles.panelSection}>
                <div className={styles.panelSectionHeader}>
                  <div className={styles.panelSectionLabel}>Time</div>
                  <button
                    ref={teamBtnRef}
                    type="button"
                    className={styles.panelEditBtn}
                    onClick={() => setEditingTeam((v) => !v)}
                  >
                    <PencilSimple size={14} /> Alterar
                  </button>
                </div>
                <div className={styles.panelPersonMeta}>
                  {selectedPerson.teams.map((t) => (
                    <Badge key={t} color={TEAM_COLORS[t] ?? "neutral"} size="sm">{t}</Badge>
                  ))}
                </div>
                <FilterDropdown
                  open={editingTeam}
                  onClose={closeTeamPicker}
                  anchorRef={teamBtnRef}
                >
                  <div className={styles.teamPickerBody}>
                    <div className={styles.teamPickerSearch}>
                      <Input
                        placeholder="Buscar time..."
                        value={teamSearch}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTeamSearch(e.target.value)}
                        leftIcon={MagnifyingGlass}
                      />
                    </div>
                    <div className={styles.teamPickerList}>
                      {filteredTeams.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={styles.teamPickerItem}
                          onClick={() => handleToggleTeam(t)}
                        >
                          <Checkbox
                            size="sm"
                            checked={selectedPerson.teams.includes(t)}
                            readOnly
                            tabIndex={-1}
                          />
                          <Badge color={TEAM_COLORS[t] ?? "neutral"} size="sm">{t}</Badge>
                        </button>
                      ))}
                      {canCreateTeam && (
                        <button
                          type="button"
                          className={styles.teamPickerCreate}
                          onClick={handleCreateTeam}
                        >
                          <Plus size={14} />
                          <span>Criar "{teamSearch.trim()}"</span>
                        </button>
                      )}
                      {filteredTeams.length === 0 && !canCreateTeam && (
                        <div className={styles.teamPickerEmpty}>Nenhum time encontrado</div>
                      )}
                    </div>
                  </div>
                </FilterDropdown>
              </div>

              {/* Manager chain breadcrumb */}
              {managerChain.length > 0 && (
                <div className={styles.panelSection}>
                  <div className={styles.panelSectionLabel}>Cadeia hierárquica</div>
                  <div className={styles.chainBreadcrumb}>
                    {managerChain.map((m, i) => (
                      <span key={m.id} className={styles.chainItem}>
                        <button type="button" className={styles.chainLink} onClick={() => selectPerson(m.id)}>
                          {m.firstName} {m.lastName}
                        </button>
                        {i < managerChain.length - 1 && <span className={styles.chainSep}>/</span>}
                      </span>
                    ))}
                    <span className={styles.chainSep}>/</span>
                    <span className={styles.chainCurrent}>{selectedPerson.firstName}</span>
                  </div>
                </div>
              )}

              {/* Reporta a (manager) */}
              <div className={styles.panelSection}>
                <div className={styles.panelSectionHeader}>
                  <div className={styles.panelSectionLabel}>Reporta a</div>
                  {!editingManager && selectedManager && (
                    <button type="button" className={styles.panelEditBtn} onClick={() => setEditingManager(true)}>
                      <PencilSimple size={14} /> Alterar
                    </button>
                  )}
                </div>

                {editingManager ? (
                  <PersonPicker
                    people={people}
                    excludeIds={managerExcludeIds}
                    onSelect={handleChangeManager}
                    onCancel={() => setEditingManager(false)}
                    placeholder="Buscar novo gestor..."
                  />
                ) : selectedManager ? (
                  <button type="button" className={styles.personRow} onClick={() => selectPerson(selectedManager.id)}>
                    <Avatar initials={selectedManager.initials ?? undefined} size="sm" />
                    <div className={styles.personRowInfo}>
                      <span className={styles.personRowName}>{selectedManager.firstName} {selectedManager.lastName}</span>
                      <span className={styles.personRowTitle}>{selectedManager.jobTitle}</span>
                    </div>
                    <ArrowBendDownRight size={14} className={styles.personRowArrow} />
                  </button>
                ) : (
                  <div className={styles.panelEmpty}>
                    <span>Nível mais alto (sem gestor)</span>
                    <Button variant="secondary" size="md" leftIcon={UserCirclePlus} onClick={() => setEditingManager(true)}>
                      Atribuir gestor
                    </Button>
                  </div>
                )}

                {selectedManager && !editingManager && (
                  <button type="button" className={styles.removeLink} onClick={handleRemoveManager}>
                    Remover gestor (mover para nível mais alto)
                  </button>
                )}
              </div>

              {/* Liderados diretos */}
              <div className={styles.panelSection}>
                <div className={styles.panelSectionHeader}>
                  <div className={styles.panelSectionLabel}>
                    Liderados diretos
                    {selectedReports.length > 0 && (
                      <Badge color="neutral" size="sm">{selectedReports.length}</Badge>
                    )}
                  </div>
                  {!addingReport && (
                    <button type="button" className={styles.panelEditBtn} onClick={() => setAddingReport(true)}>
                      <Plus size={14} /> Adicionar
                    </button>
                  )}
                </div>

                {addingReport && (
                  <PersonPicker
                    people={people}
                    excludeIds={reportExcludeIds}
                    onSelect={handleAddReport}
                    onCancel={() => setAddingReport(false)}
                    placeholder="Buscar colaborador para adicionar..."
                  />
                )}

                {selectedReports.length > 0 ? (
                  <div className={styles.reportList}>
                    {selectedReports.map((r) => (
                      <div key={r.id} className={styles.reportRow}>
                        <button type="button" className={styles.personRow} onClick={() => selectPerson(r.id)}>
                          <Avatar initials={r.initials ?? undefined} size="sm" />
                          <div className={styles.personRowInfo}>
                            <span className={styles.personRowName}>{r.firstName} {r.lastName}</span>
                            <span className={styles.personRowTitle}>{r.jobTitle}</span>
                          </div>
                          {people.some((p) => p.managerId === r.id) && (
                            <span className={styles.reportsCount}>
                              <UsersThree size={12} />
                              {people.filter((p) => p.managerId === r.id).length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          className={styles.reportRemove}
                          onClick={() => handleRemoveReport(r.id)}
                          title="Remover liderado"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : !addingReport && (
                  <div className={styles.panelEmpty}>
                    <span>Nenhum liderado direto</span>
                    <Button variant="secondary" size="md" leftIcon={UserCirclePlus} onClick={() => setAddingReport(true)}>
                      Adicionar liderado
                    </Button>
                  </div>
                )}
              </div>
            </DrawerBody>
          </>
        )}
      </Drawer>
    </>
  );
}
