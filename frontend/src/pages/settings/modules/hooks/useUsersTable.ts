import { useMemo, useRef, useState, type RefObject } from "react";
import { useDataTable, useFilterChips } from "@getbud-co/buds";
import type { PeopleUserView } from "@/contexts/PeopleDataContext";

type SortKey = "name" | "teams" | "role" | "status";

export function useUsersTable(
  pageUsers: PeopleUserView[],
  resolveRoleSlug: (roleType: string) => string,
) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const statusChipRef = useRef<HTMLDivElement>(null);
  const roleChipRef = useRef<HTMLDivElement>(null);

  const chipRefs: Record<string, RefObject<HTMLDivElement | null>> = {
    status: statusChipRef,
    role: roleChipRef,
  };

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

  function getFilterLabel(id: string, roleFilterOptions: { id: string; label: string }[]): string {
    if (id === "status") {
      const map: Record<string, string> = { all: "Todos", active: "Ativo", inactive: "Inativo", invited: "Convidado", suspended: "Suspenso" };
      return map[filterStatus] ?? "Status";
    }
    if (id === "role") return roleFilterOptions.find((r) => r.id === filterRole)?.label ?? "Tipo";
    return id;
  }

  return {
    search, setSearch,
    filterStatus, setFilterStatus,
    filterRole, setFilterRole,
    statusChipRef, roleChipRef, chipRefs,
    selectedRows, clearSelection,
    sortKey, sortDir, handleSort, getSortDirection,
    handleSelectRow, handleSelectAll,
    activeFilters, openFilter, setOpenFilter,
    addFilterAndOpen, removeFilter, clearAllFilters,
    toggleFilterDropdown, getAvailableFilters, ignoreChipRefs,
    filtered, rowIds,
    allSelectedInactive,
    getFilterLabel,
  };
}
