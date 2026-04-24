import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Cycle, Permission, Tag } from "@/types";
import { AuthContext } from "@/contexts/AuthContext";
import {
  apiCycleToView,
  createCycle as createCycleApi,
  cycleErrorToMessage,
  deleteCycle as deleteCycleApi,
  listCycles,
  updateCycle as updateCycleApi,
  type CycleParams,
} from "@/lib/cycles-api";
import {
  createCompanyValueIdFromName,
  createRoleId,
  createRoleSlug,
  createTagIdFromName,
  loadConfigSnapshot,
  resetConfigSnapshot,
  saveConfigSnapshot,
  type CompanyProfile,
  type CompanyValueRecord,
  type ConfigRoleRecord,
  type ConfigStoreSnapshot,
} from "@/lib/config-store";

const LEGACY_LOCAL_ORG_ID = "org-1";

function noToken() {
  return null;
}

interface RoleOption {
  id: string;
  value: string;
  label: string;
  description: string;
  type: ConfigRoleRecord["type"];
  scope: ConfigRoleRecord["scope"];
  isDefault: boolean;
}

interface TagOption {
  id: string;
  label: string;
  color: string;
}

interface CyclePresetOption {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: Cycle["status"];
}

interface CreateRoleInput {
  slug?: string;
  name: string;
  description?: string | null;
  type?: ConfigRoleRecord["type"];
  scope?: ConfigRoleRecord["scope"];
  isDefault?: boolean;
  permissionIds?: string[];
}

type RolesStatus = "idle" | "loading" | "ready" | "error";
type CyclesStatus = "idle" | "loading" | "ready" | "error";

interface ConfigDataContextValue {
  activeOrgId: string;
  organizations: CompanyProfile[];
  activeOrganization: CompanyProfile | null;
  companyValues: CompanyValueRecord[];
  tags: Tag[];
  cycles: Cycle[];
  cyclesStatus: CyclesStatus;
  cyclesError: string | null;
  roles: ConfigRoleRecord[];
  permissions: Permission[];
  rolesStatus: RolesStatus;
  roleOptions: RoleOption[];
  tagOptions: TagOption[];
  cyclePresetOptions: CyclePresetOption[];
  setActiveOrgId: (orgId: string) => void;
  setCompanyValues: Dispatch<SetStateAction<CompanyValueRecord[]>>;
  setTags: Dispatch<SetStateAction<Tag[]>>;
  setCycles: Dispatch<SetStateAction<Cycle[]>>;
  setRoles: Dispatch<SetStateAction<ConfigRoleRecord[]>>;
  updateCompanyProfile: (patch: Partial<Omit<CompanyProfile, "id">>) => void;
  createCompanyValue: (input: {
    name: string;
    description: string;
  }) => CompanyValueRecord;
  updateCompanyValue: (
    valueId: string,
    patch: Partial<Pick<CompanyValueRecord, "name" | "description">>,
  ) => CompanyValueRecord | null;
  deleteCompanyValue: (valueId: string) => void;
  createTag: (input: { name: string; color?: string }) => Tag;
  updateTag: (
    tagId: string,
    patch: Partial<Pick<Tag, "name" | "color">>,
  ) => Tag | null;
  deleteTag: (tagId: string) => void;
  createCycle: (
    input: Omit<Cycle, "id" | "orgId" | "createdAt" | "updatedAt">,
  ) => Promise<Cycle>;
  updateCycle: (
    cycleId: string,
    patch: Partial<Omit<Cycle, "id" | "orgId" | "createdAt">>,
  ) => Promise<Cycle | null>;
  deleteCycle: (cycleId: string) => Promise<void>;
  createRole: (input: CreateRoleInput) => ConfigRoleRecord;
  updateRole: (
    roleId: string,
    patch: Partial<Omit<ConfigRoleRecord, "id" | "orgId" | "createdAt">>,
  ) => ConfigRoleRecord | null;
  deleteRole: (roleId: string) => boolean;
  resolveRoleSlug: (legacyOrCanonical: string) => string;
  resolveCycleId: (legacyOrCanonical: string) => string;
  resolveTagId: (legacyOrCanonical: string) => string;
  getRoleBySlug: (slugOrId: string) => ConfigRoleRecord | null;
  getTagById: (tagId: string) => Tag | null;
  getCycleById: (cycleId: string) => Cycle | null;
  getCompanyValueById: (valueId: string) => CompanyValueRecord | null;
  resetToSeed: () => void;
  updatedAt: string;
}

const ConfigDataContext = createContext<ConfigDataContextValue | null>(null);

function cloneDeep<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortCompanyValues(values: CompanyValueRecord[]): CompanyValueRecord[] {
  return [...values].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function sortTags(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function sortCycles(cycles: Cycle[]): Cycle[] {
  return [...cycles].sort((a, b) => {
    const startA = new Date(a.startDate).getTime();
    const startB = new Date(b.startDate).getTime();
    return startA - startB;
  });
}

function cycleToParams(
  cycle: Pick<
    Cycle,
    | "name"
    | "type"
    | "startDate"
    | "endDate"
    | "status"
    | "okrDefinitionDeadline"
    | "midReviewDate"
  >,
): CycleParams {
  return {
    name: cycle.name,
    type: cycle.type,
    start_date: cycle.startDate,
    end_date: cycle.endDate,
    status: cycle.status,
    okr_definition_deadline: cycle.okrDefinitionDeadline,
    mid_review_date: cycle.midReviewDate,
  };
}

function sortRoles(roles: ConfigRoleRecord[]): ConfigRoleRecord[] {
  return [...roles].sort((a, b) => {
    if (a.type !== b.type) return a.type === "system" ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function ensureUniqueRoleSlug(
  roles: ConfigRoleRecord[],
  slug: string,
  roleIdToIgnore?: string,
): string {
  const base = slug || `role-${Date.now()}`;
  let candidate = base;
  let counter = 2;

  while (
    roles.some((role) => role.slug === candidate && role.id !== roleIdToIgnore)
  ) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function ensureUniqueId(existingIds: string[], baseId: string): string {
  if (!existingIds.includes(baseId)) return baseId;

  let counter = 2;
  let candidate = `${baseId}-${counter}`;
  while (existingIds.includes(candidate)) {
    counter += 1;
    candidate = `${baseId}-${counter}`;
  }

  return candidate;
}

export function ConfigDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ConfigStoreSnapshot>(() =>
    loadConfigSnapshot(),
  );
  const [apiCycles, setApiCycles] = useState<Cycle[]>([]);
  const [cyclesStatus, setCyclesStatus] = useState<CyclesStatus>("idle");
  const [cyclesError, setCyclesError] = useState<string | null>(null);
  const [rolesStatus] = useState<RolesStatus>("idle");
  const authContext = useContext(AuthContext);
  const {
    isAuthenticated,
    organizations: sessionOrganizations,
    activeOrganization: sessionActiveOrganization,
    getToken,
  } = authContext ?? {
    isAuthenticated: false,
    organizations: [],
    activeOrganization: null,
    getToken: noToken,
  };

  const accessibleOrgIds = useMemo(
    () =>
      isAuthenticated && sessionOrganizations.length > 0
        ? sessionOrganizations.map((organization) => organization.id)
        : [],
    [isAuthenticated, sessionOrganizations],
  );

  const accessibleOrgIdSet = useMemo(
    () => new Set(accessibleOrgIds),
    [accessibleOrgIds],
  );

  const isUsingLegacyLocalOrg = accessibleOrgIds.length > 0;

  useEffect(() => {
    if (!isAuthenticated || sessionOrganizations.length === 0) return;

    setSnapshot((prev) => {
      let changed = false;
      const organizationsById = { ...prev.organizationsById };

      sessionOrganizations.forEach((organization) => {
        const existing = organizationsById[organization.id];
        const nextOrganization = {
          id: organization.id,
          name: organization.name,
          legalName: existing?.legalName ?? organization.name,
          slug: existing?.slug ?? organization.workspace,
          cnpj: existing?.cnpj ?? null,
          logoUrl: existing?.logoUrl ?? null,
          plan: existing?.plan ?? "enterprise",
          timezone: existing?.timezone ?? "America/Sao_Paulo",
          language: existing?.language ?? "pt-BR",
          parentOrgId: existing?.parentOrgId ?? null,
          orgType: existing?.orgType ?? "company",
          depth: existing?.depth ?? 0,
          path: existing?.path ?? [organization.id],
        };

        if (
          !existing ||
          JSON.stringify(existing) !== JSON.stringify(nextOrganization)
        ) {
          organizationsById[organization.id] = nextOrganization;
          changed = true;
        }
      });

      const nextActiveOrgId =
        sessionActiveOrganization?.id ??
        (accessibleOrgIdSet.has(prev.activeOrgId)
          ? prev.activeOrgId
          : (accessibleOrgIds[0] ?? prev.activeOrgId));

      if (!changed && nextActiveOrgId === prev.activeOrgId) {
        return prev;
      }

      return saveConfigSnapshot({
        activeOrgId: nextActiveOrgId,
        organizationsById,
        companyValuesByOrg: prev.companyValuesByOrg,
        tagsByOrg: prev.tagsByOrg,
        cyclesByOrg: prev.cyclesByOrg,
        rolesByOrg: prev.rolesByOrg,
        permissions: prev.permissions,
        legacyRoleSlugAliases: prev.legacyRoleSlugAliases,
        legacyCycleIdAliases: prev.legacyCycleIdAliases,
        legacyTagIdAliases: prev.legacyTagIdAliases,
      });
    });
  }, [
    accessibleOrgIdSet,
    accessibleOrgIds,
    isAuthenticated,
    sessionActiveOrganization,
    sessionOrganizations,
  ]);

  const activeOrgId = useMemo(() => {
    if (isUsingLegacyLocalOrg) {
      if (snapshot.organizationsById[LEGACY_LOCAL_ORG_ID]) return LEGACY_LOCAL_ORG_ID;
      return snapshot.organizationsById[snapshot.activeOrgId]
        ? snapshot.activeOrgId
        : (Object.keys(snapshot.organizationsById)[0] ?? LEGACY_LOCAL_ORG_ID);
    }

    return snapshot.organizationsById[snapshot.activeOrgId]
      ? snapshot.activeOrgId
      : (Object.keys(snapshot.organizationsById)[0] ?? LEGACY_LOCAL_ORG_ID);
  }, [isUsingLegacyLocalOrg, snapshot.activeOrgId, snapshot.organizationsById]);

  const organizations = useMemo(
    () =>
      Object.values(snapshot.organizationsById)
        .filter(
          (organization) =>
            accessibleOrgIds.length === 0 ||
            accessibleOrgIdSet.has(organization.id),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [accessibleOrgIdSet, accessibleOrgIds.length, snapshot.organizationsById],
  );

  const activeOrganization = useMemo(
    () => snapshot.organizationsById[activeOrgId] ?? null,
    [snapshot.organizationsById, activeOrgId],
  );

  const companyValues = useMemo(
    () => sortCompanyValues(snapshot.companyValuesByOrg[activeOrgId] ?? []),
    [snapshot.companyValuesByOrg, activeOrgId],
  );

  const tags = useMemo(
    () => sortTags(snapshot.tagsByOrg[activeOrgId] ?? []),
    [snapshot.tagsByOrg, activeOrgId],
  );

  const cycles = useMemo(() => sortCycles(apiCycles), [apiCycles]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setApiCycles([]);
      setCyclesStatus("error");
      setCyclesError("Sessão expirada. Faça login novamente.");
      return;
    }

    let cancelled = false;
    setApiCycles([]);
    setCyclesStatus("loading");
    setCyclesError(null);

    listCycles(token, { size: 100 })
      .then((response) => {
        if (cancelled) return;
        setApiCycles(response.data.map(apiCycleToView));
        setCyclesStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setApiCycles([]);
        setCyclesError(cycleErrorToMessage(err));
        setCyclesStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [getToken, sessionActiveOrganization?.id]);

  const roles = useMemo(
    () => sortRoles(snapshot.rolesByOrg[activeOrgId] ?? []),
    [snapshot.rolesByOrg, activeOrgId],
  );

  const roleOptions = useMemo<RoleOption[]>(
    () =>
      roles.map((role) => ({
        id: role.id,
        value: role.slug,
        label: role.name,
        description: role.description ?? "",
        type: role.type,
        scope: role.scope,
        isDefault: role.isDefault,
      })),
    [roles],
  );

  const tagOptions = useMemo<TagOption[]>(
    () =>
      tags.map((tag) => ({ id: tag.id, label: tag.name, color: tag.color })),
    [tags],
  );

  const cyclePresetOptions = useMemo<CyclePresetOption[]>(
    () =>
      cycles.map((cycle) => ({
        id: cycle.id,
        label: cycle.name,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        status: cycle.status,
      })),
    [cycles],
  );

  const setActiveOrgId = useCallback((orgId: string) => {
    setSnapshot((prev) => {
      if (!prev.organizationsById[orgId] || orgId === prev.activeOrgId)
        return prev;
      return saveConfigSnapshot({
        activeOrgId: orgId,
        organizationsById: prev.organizationsById,
        companyValuesByOrg: prev.companyValuesByOrg,
        tagsByOrg: prev.tagsByOrg,
        cyclesByOrg: prev.cyclesByOrg,
        rolesByOrg: prev.rolesByOrg,
        permissions: prev.permissions,
        legacyRoleSlugAliases: prev.legacyRoleSlugAliases,
        legacyCycleIdAliases: prev.legacyCycleIdAliases,
        legacyTagIdAliases: prev.legacyTagIdAliases,
      });
    });
  }, []);

  const setCompanyValues = useCallback<
    Dispatch<SetStateAction<CompanyValueRecord[]>>
  >(
    (updater) => {
      setSnapshot((prev) => {
        const current = prev.companyValuesByOrg[activeOrgId] ?? [];
        const nextValues =
          typeof updater === "function"
            ? (
                updater as (
                  values: CompanyValueRecord[],
                ) => CompanyValueRecord[]
              )(cloneDeep(current))
            : updater;

        return saveConfigSnapshot({
          activeOrgId: prev.activeOrgId,
          organizationsById: prev.organizationsById,
          companyValuesByOrg: {
            ...prev.companyValuesByOrg,
            [activeOrgId]: sortCompanyValues(
              nextValues.map((value) => ({ ...value, orgId: activeOrgId })),
            ),
          },
          tagsByOrg: prev.tagsByOrg,
          cyclesByOrg: prev.cyclesByOrg,
          rolesByOrg: prev.rolesByOrg,
          permissions: prev.permissions,
          legacyRoleSlugAliases: prev.legacyRoleSlugAliases,
          legacyCycleIdAliases: prev.legacyCycleIdAliases,
          legacyTagIdAliases: prev.legacyTagIdAliases,
        });
      });
    },
    [activeOrgId],
  );

  const setTags = useCallback<Dispatch<SetStateAction<Tag[]>>>(
    (updater) => {
      setSnapshot((prev) => {
        const current = prev.tagsByOrg[activeOrgId] ?? [];
        const nextTags =
          typeof updater === "function"
            ? (updater as (tags: Tag[]) => Tag[])(cloneDeep(current))
            : updater;

        return saveConfigSnapshot({
          activeOrgId: prev.activeOrgId,
          organizationsById: prev.organizationsById,
          companyValuesByOrg: prev.companyValuesByOrg,
          tagsByOrg: {
            ...prev.tagsByOrg,
            [activeOrgId]: sortTags(
              nextTags.map((tag) => ({ ...tag, orgId: activeOrgId })),
            ),
          },
          cyclesByOrg: prev.cyclesByOrg,
          rolesByOrg: prev.rolesByOrg,
          permissions: prev.permissions,
          legacyRoleSlugAliases: prev.legacyRoleSlugAliases,
          legacyCycleIdAliases: prev.legacyCycleIdAliases,
          legacyTagIdAliases: prev.legacyTagIdAliases,
        });
      });
    },
    [activeOrgId],
  );

  const setCycles = useCallback<Dispatch<SetStateAction<Cycle[]>>>((updater) => {
    setApiCycles((prev) =>
      typeof updater === "function"
        ? (updater as (cycles: Cycle[]) => Cycle[])(cloneDeep(prev))
        : updater,
    );
  }, []);

  const setRoles = useCallback<Dispatch<SetStateAction<ConfigRoleRecord[]>>>(
    (updater) => {
      setSnapshot((prev) => {
        const current = prev.rolesByOrg[activeOrgId] ?? [];
        const nextRoles =
          typeof updater === "function"
            ? (updater as (roles: ConfigRoleRecord[]) => ConfigRoleRecord[])(
                cloneDeep(current),
              )
            : updater;

        return saveConfigSnapshot({
          activeOrgId: prev.activeOrgId,
          organizationsById: prev.organizationsById,
          companyValuesByOrg: prev.companyValuesByOrg,
          tagsByOrg: prev.tagsByOrg,
          cyclesByOrg: prev.cyclesByOrg,
          rolesByOrg: {
            ...prev.rolesByOrg,
            [activeOrgId]: sortRoles(
              nextRoles.map((role) => ({ ...role, orgId: activeOrgId })),
            ),
          },
          permissions: prev.permissions,
          legacyRoleSlugAliases: prev.legacyRoleSlugAliases,
          legacyCycleIdAliases: prev.legacyCycleIdAliases,
          legacyTagIdAliases: prev.legacyTagIdAliases,
        });
      });
    },
    [activeOrgId],
  );

  const updateCompanyProfile = useCallback(
    (patch: Partial<Omit<CompanyProfile, "id">>) => {
      setSnapshot((prev) => {
        const current = prev.organizationsById[activeOrgId];
        if (!current) return prev;

        const next = {
          ...current,
          ...patch,
        };

        return saveConfigSnapshot({
          activeOrgId: prev.activeOrgId,
          organizationsById: {
            ...prev.organizationsById,
            [activeOrgId]: next,
          },
          companyValuesByOrg: prev.companyValuesByOrg,
          tagsByOrg: prev.tagsByOrg,
          cyclesByOrg: prev.cyclesByOrg,
          rolesByOrg: prev.rolesByOrg,
          permissions: prev.permissions,
          legacyRoleSlugAliases: prev.legacyRoleSlugAliases,
          legacyCycleIdAliases: prev.legacyCycleIdAliases,
          legacyTagIdAliases: prev.legacyTagIdAliases,
        });
      });
    },
    [activeOrgId],
  );

  const createCompanyValue = useCallback(
    (input: { name: string; description: string }) => {
      const now = new Date().toISOString();
      const nextId = ensureUniqueId(
        companyValues.map((value) => value.id),
        createCompanyValueIdFromName(input.name),
      );
      const value: CompanyValueRecord = {
        id: nextId,
        orgId: activeOrgId,
        name: input.name,
        description: input.description,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      setCompanyValues((prev) => [...prev, value]);
      return value;
    },
    [activeOrgId, companyValues, setCompanyValues],
  );

  const updateCompanyValue = useCallback(
    (
      valueId: string,
      patch: Partial<Pick<CompanyValueRecord, "name" | "description">>,
    ) => {
      let updated: CompanyValueRecord | null = null;

      setCompanyValues((prev) =>
        prev.map((value) => {
          if (value.id !== valueId) return value;
          updated = {
            ...value,
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }),
      );

      return updated;
    },
    [setCompanyValues],
  );

  const deleteCompanyValue = useCallback(
    (valueId: string) => {
      setCompanyValues((prev) => prev.filter((value) => value.id !== valueId));
    },
    [setCompanyValues],
  );

  const createTag = useCallback(
    (input: { name: string; color?: string }) => {
      const now = new Date().toISOString();
      const nextId = ensureUniqueId(
        tags.map((tag) => tag.id),
        createTagIdFromName(input.name),
      );
      const tag: Tag = {
        id: nextId,
        orgId: activeOrgId,
        name: input.name,
        color: input.color ?? "neutral",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      setTags((prev) => [...prev, tag]);
      return tag;
    },
    [activeOrgId, tags, setTags],
  );

  const updateTag = useCallback(
    (tagId: string, patch: Partial<Pick<Tag, "name" | "color">>) => {
      let updated: Tag | null = null;

      setTags((prev) =>
        prev.map((tag) => {
          if (tag.id !== tagId) return tag;
          updated = {
            ...tag,
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }),
      );

      return updated;
    },
    [setTags],
  );

  const deleteTag = useCallback(
    (tagId: string) => {
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
    },
    [setTags],
  );

  const createCycle = useCallback(
    async (input: Omit<Cycle, "id" | "orgId" | "createdAt" | "updatedAt">) => {
      const token = getToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const created = apiCycleToView(await createCycleApi(cycleToParams(input), token));
      setApiCycles((prev) => sortCycles([...prev, created]));
      return created;
    },
    [getToken],
  );

  const updateCycle = useCallback(
    async (
      cycleId: string,
      patch: Partial<Omit<Cycle, "id" | "orgId" | "createdAt">>,
    ) => {
      const token = getToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const current = apiCycles.find((cycle) => cycle.id === cycleId);
      if (!current) return null;
      const updated = apiCycleToView(
        await updateCycleApi(cycleId, cycleToParams({ ...current, ...patch }), token),
      );
      setApiCycles((prev) =>
        sortCycles(prev.map((cycle) => (cycle.id === cycleId ? updated : cycle))),
      );
      return updated;
    },
    [apiCycles, getToken],
  );

  const deleteCycle = useCallback(
    async (cycleId: string) => {
      const token = getToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      await deleteCycleApi(cycleId, token);
      setApiCycles((prev) => prev.filter((cycle) => cycle.id !== cycleId));
    },
    [getToken],
  );

  const createRole = useCallback(
    (input: CreateRoleInput) => {
      const now = new Date().toISOString();
      const rawSlug = input.slug
        ? createRoleSlug(input.slug)
        : createRoleSlug(input.name);
      const slug = ensureUniqueRoleSlug(roles, rawSlug);
      const nextRole: ConfigRoleRecord = {
        id: createRoleId(activeOrgId, slug),
        orgId: activeOrgId,
        slug,
        name: input.name,
        description: input.description ?? null,
        type: input.type ?? "custom",
        scope: input.scope ?? "self",
        isDefault: Boolean(input.isDefault),
        permissionIds: Array.from(new Set(input.permissionIds ?? [])),
        createdAt: now,
        updatedAt: now,
      };

      setRoles((prev) => {
        const normalized = nextRole.isDefault
          ? prev.map((role) => ({ ...role, isDefault: false }))
          : prev;
        return [...normalized, nextRole];
      });

      return nextRole;
    },
    [roles, activeOrgId, setRoles],
  );

  const updateRole = useCallback(
    (
      roleId: string,
      patch: Partial<Omit<ConfigRoleRecord, "id" | "orgId" | "createdAt">>,
    ) => {
      const current = roles.find((role) => role.id === roleId);
      if (!current) return null;
      if (current.type === "system") return null;

      const requestedSlug = patch.slug
        ? createRoleSlug(patch.slug)
        : current.slug;
      const slug = ensureUniqueRoleSlug(roles, requestedSlug, roleId);
      let updatedRole: ConfigRoleRecord | null = null;

      setRoles((prev) => {
        const shouldSetDefault = patch.isDefault === true;
        const normalized = shouldSetDefault
          ? prev.map((role) => ({ ...role, isDefault: role.id === roleId }))
          : prev;

        return normalized.map((role) => {
          if (role.id !== roleId) return role;
          updatedRole = {
            ...role,
            ...patch,
            slug,
            permissionIds: patch.permissionIds
              ? Array.from(new Set(patch.permissionIds))
              : role.permissionIds,
            updatedAt: new Date().toISOString(),
          };
          return updatedRole;
        });
      });

      return updatedRole;
    },
    [roles, setRoles],
  );

  const deleteRole = useCallback(
    (roleId: string) => {
      const target = roles.find((role) => role.id === roleId);
      if (!target || target.type === "system") return false;

      setRoles((prev) => prev.filter((role) => role.id !== roleId));
      return true;
    },
    [roles, setRoles],
  );

  const resolveRoleSlug = useCallback(
    (legacyOrCanonical: string) => {
      const direct = roles.find(
        (role) =>
          role.slug === legacyOrCanonical || role.id === legacyOrCanonical,
      );
      if (direct) return direct.slug;
      return (
        snapshot.legacyRoleSlugAliases[legacyOrCanonical] ?? legacyOrCanonical
      );
    },
    [roles, snapshot.legacyRoleSlugAliases],
  );

  const resolveCycleId = useCallback(
    (legacyOrCanonical: string) => {
      if (cycles.some((cycle) => cycle.id === legacyOrCanonical))
        return legacyOrCanonical;
      return (
        snapshot.legacyCycleIdAliases[legacyOrCanonical] ?? legacyOrCanonical
      );
    },
    [cycles, snapshot.legacyCycleIdAliases],
  );

  const resolveTagId = useCallback(
    (legacyOrCanonical: string) => {
      if (tags.some((tag) => tag.id === legacyOrCanonical))
        return legacyOrCanonical;
      return (
        snapshot.legacyTagIdAliases[legacyOrCanonical] ?? legacyOrCanonical
      );
    },
    [tags, snapshot.legacyTagIdAliases],
  );

  const getRoleBySlug = useCallback(
    (slugOrId: string) => {
      const resolved = resolveRoleSlug(slugOrId);
      return (
        roles.find((role) => role.slug === resolved || role.id === slugOrId) ??
        null
      );
    },
    [roles, resolveRoleSlug],
  );

  const getTagById = useCallback(
    (tagId: string) => {
      const resolved = resolveTagId(tagId);
      return tags.find((tag) => tag.id === resolved) ?? null;
    },
    [tags, resolveTagId],
  );

  const getCycleById = useCallback(
    (cycleId: string) => {
      const resolved = resolveCycleId(cycleId);
      return cycles.find((cycle) => cycle.id === resolved) ?? null;
    },
    [cycles, resolveCycleId],
  );

  const getCompanyValueById = useCallback(
    (valueId: string) => {
      return companyValues.find((value) => value.id === valueId) ?? null;
    },
    [companyValues],
  );

  const resetToSeed = useCallback(() => {
    setSnapshot(resetConfigSnapshot());
  }, []);

  const value = useMemo<ConfigDataContextValue>(
    () => ({
      activeOrgId,
      organizations,
      activeOrganization,
      companyValues,
      tags,
      cycles,
      cyclesStatus,
      cyclesError,
      roles,
      permissions: snapshot.permissions,
      rolesStatus,
      roleOptions,
      tagOptions,
      cyclePresetOptions,
      setActiveOrgId,
      setCompanyValues,
      setTags,
      setCycles,
      setRoles,
      updateCompanyProfile,
      createCompanyValue,
      updateCompanyValue,
      deleteCompanyValue,
      createTag,
      updateTag,
      deleteTag,
      createCycle,
      updateCycle,
      deleteCycle,
      createRole,
      updateRole,
      deleteRole,
      resolveRoleSlug,
      resolveCycleId,
      resolveTagId,
      getRoleBySlug,
      getTagById,
      getCycleById,
      getCompanyValueById,
      resetToSeed,
      updatedAt: snapshot.updatedAt,
    }),
    [
      activeOrgId,
      organizations,
      activeOrganization,
      companyValues,
      tags,
      cycles,
      cyclesStatus,
      cyclesError,
      roles,
      snapshot.permissions,
      rolesStatus,
      roleOptions,
      tagOptions,
      cyclePresetOptions,
      setActiveOrgId,
      setCompanyValues,
      setTags,
      setCycles,
      setRoles,
      updateCompanyProfile,
      createCompanyValue,
      updateCompanyValue,
      deleteCompanyValue,
      createTag,
      updateTag,
      deleteTag,
      createCycle,
      updateCycle,
      deleteCycle,
      createRole,
      updateRole,
      deleteRole,
      resolveRoleSlug,
      resolveCycleId,
      resolveTagId,
      getRoleBySlug,
      getTagById,
      getCycleById,
      getCompanyValueById,
      resetToSeed,
      snapshot.updatedAt,
    ],
  );

  return (
    <ConfigDataContext.Provider value={value}>
      {children}
    </ConfigDataContext.Provider>
  );
}

export function useConfigData() {
  const context = useContext(ConfigDataContext);
  if (!context) {
    throw new Error("useConfigData must be used within ConfigDataProvider");
  }
  return context;
}
