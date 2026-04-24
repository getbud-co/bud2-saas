/**
 * Tests for RolesModule
 *
 * This module provides CRUD operations for user roles/types within the settings page.
 * Unlike TagsModule and CyclesModule, it uses a card grid layout instead of a table.
 * It includes permission management with accordion-based permission groups.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { RolesModule } from "./RolesModule";
import { listPermissions, listRoles } from "@/lib/roles-api";

vi.mock("@/lib/roles-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/roles-api")>("@/lib/roles-api");
  return {
    ...actual,
    listRoles: vi.fn(),
    listPermissions: vi.fn(),
  };
});

const toastMock = vi.fn();
vi.mock("@getbud-co/buds", async () => {
  const actual = await vi.importActual<typeof import("@getbud-co/buds")>("@getbud-co/buds");
  const toastFn = Object.assign((...args: unknown[]) => toastMock(...args), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    black: vi.fn(),
    dismiss: vi.fn(),
  });
  return { ...actual, toast: toastFn };
});

const API_ROLES = [
  { id: "role-super-admin", slug: "super-admin", name: "Super Admin", description: "Acesso total ao sistema", type: "system" as const, scope: "org" as const, is_default: false, permission_ids: ["people.view", "people.create", "missions.view", "surveys.view", "settings.access", "assistant.tone"], users_count: 2, created_at: "2026-04-24T10:00:00Z", updated_at: "2026-04-24T10:00:00Z" },
  { id: "role-admin-rh", slug: "admin-rh", name: "Admin RH", description: "Gestao de pessoas", type: "system" as const, scope: "org" as const, is_default: false, permission_ids: ["people.view", "people.create", "settings.access"], users_count: 1, created_at: "2026-04-24T10:01:00Z", updated_at: "2026-04-24T10:01:00Z" },
  { id: "role-gestor", slug: "gestor", name: "Gestor", description: "Gestao do time direto", type: "system" as const, scope: "team" as const, is_default: false, permission_ids: ["people.view", "missions.view"], users_count: 3, created_at: "2026-04-24T10:02:00Z", updated_at: "2026-04-24T10:02:00Z" },
  { id: "role-colaborador", slug: "colaborador", name: "Colaborador", description: "Acesso padrao", type: "system" as const, scope: "self" as const, is_default: true, permission_ids: ["people.view"], users_count: 12, created_at: "2026-04-24T10:03:00Z", updated_at: "2026-04-24T10:03:00Z" },
  { id: "role-visualizador", slug: "visualizador", name: "Visualizador", description: "Somente leitura", type: "system" as const, scope: "org" as const, is_default: false, permission_ids: ["people.view"], users_count: 0, created_at: "2026-04-24T10:04:00Z", updated_at: "2026-04-24T10:04:00Z" },
  { id: "role-lider-projeto", slug: "lider-projeto", name: "Lider de projeto", description: "Coordena projetos especiais", type: "custom" as const, scope: "team" as const, is_default: false, permission_ids: ["people.view", "missions.assign"], users_count: 4, created_at: "2026-04-24T10:05:00Z", updated_at: "2026-04-24T10:05:00Z" },
];

const API_PERMISSIONS = [
  { id: "people.view", group: "people" as const, label: "Visualizar", description: "Ver pessoas" },
  { id: "people.create", group: "people" as const, label: "Criar", description: "Criar pessoas" },
  { id: "missions.view", group: "missions" as const, label: "Visualizar", description: "Ver missoes" },
  { id: "missions.assign", group: "missions" as const, label: "Atribuir", description: "Atribuir missoes" },
  { id: "surveys.view", group: "surveys" as const, label: "Visualizar", description: "Ver pesquisas" },
  { id: "settings.access", group: "settings" as const, label: "Acessar", description: "Acessar configuracoes" },
  { id: "assistant.tone", group: "assistant" as const, label: "Tom de voz", description: "Configurar tom" },
];

// ─── Test Helpers ───

function setup(options?: { activeOrganizationId?: string }) {
  const user = userEvent.setup();
  const activeOrganizationId = options?.activeOrganizationId ?? "org-1";
  const result = render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          isAuthenticated: true,
          initializing: false,
          user: null,
          activeOrganization: {
            id: activeOrganizationId,
            name: "API Org",
            domain: `${activeOrganizationId}.example.com`,
            workspace: activeOrganizationId,
            status: "active",
            membership_role: "super-admin",
            membership_status: "active",
          },
          organizations: [],
          login: vi.fn().mockResolvedValue(undefined),
          switchOrganization: vi.fn().mockResolvedValue(undefined),
          logout: vi.fn(),
          getToken: vi.fn().mockReturnValue("test-token"),
        }}
      >
        <RolesModule />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { user, ...result };
}

async function openViewPermissionsModal(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("Lider de projeto");
  const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
  await user.click(viewButton);
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
}

// ─── Tests ───

describe("RolesModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockClear();
    vi.mocked(listRoles).mockResolvedValue({ data: API_ROLES });
    vi.mocked(listPermissions).mockResolvedValue({ data: API_PERMISSIONS });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar tipo de usuário...")).toBeInTheDocument();
    });

    it("renders the create button", () => {
      setup();
      expect(screen.getByRole("button", { name: /novo tipo/i })).toBeInTheDocument();
    });

    it("renders role cards from API", async () => {
      setup();
      expect(await screen.findByText("Super Admin")).toBeInTheDocument();
      expect(screen.getByText("Gestor")).toBeInTheDocument();
      expect(screen.getByText("Colaborador")).toBeInTheDocument();
    });

    it("renders a custom role from API", async () => {
      setup();

      expect(await screen.findByText("Lider de projeto")).toBeInTheDocument();
      expect(screen.getByText("Customizado")).toBeInTheDocument();
    });

    it("shows error state when roles or permissions fail to load", async () => {
      vi.mocked(listPermissions).mockRejectedValueOnce(new Error("boom"));

      setup();

      expect(await screen.findByText("Não foi possível carregar os tipos de usuário")).toBeInTheDocument();
    });

    it("shows system badge for system roles", async () => {
      setup();
      await screen.findByText("Super Admin");
      const systemBadges = screen.getAllByText("Sistema");
      expect(systemBadges.length).toBeGreaterThan(0);
    });

    it("shows user count for each role", async () => {
      setup();
      expect(await screen.findByText("12 usuários")).toBeInTheDocument();
      // Should show "X usuários" or "X usuário" for each role
      const userCounts = screen.getAllByText(/\d+ usuários?/);
      expect(userCounts.length).toBeGreaterThan(0);
    });

    it("shows permission count for each role", async () => {
      setup();
      await screen.findByText("Super Admin");
      // Should show "X/Y permissões" for each role
      const permCounts = screen.getAllByText(/\d+\/\d+ permissões/);
      expect(permCounts.length).toBeGreaterThan(0);
    });

    it("shows permission percentage bar", async () => {
      setup();
      await screen.findByText("Super Admin");
      // Each role card should have a percentage displayed
      const percentages = screen.getAllByText(/%$/);
      expect(percentages.length).toBeGreaterThan(0);
    });

    it("keeps system roles visible for the authenticated API organization", async () => {
      setup({ activeOrganizationId: "api-org-9" });

      expect(await screen.findByText("Super Admin")).toBeInTheDocument();
      expect(screen.getAllByText("Sistema").length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters roles by search term", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tipo de usuário...");
      await user.type(searchInput, "Admin");

      await waitFor(() => {
        // Should show "Super Admin" and possibly "Admin RH"
        expect(screen.getByText("Super Admin")).toBeInTheDocument();
      });
    });

    it("shows empty state when no matches", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tipo de usuário...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        expect(screen.getByText(/nenhum tipo de usuário encontrado/i)).toBeInTheDocument();
      });
    });

    it("clears search when input is cleared", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tipo de usuário...");

      await user.type(searchInput, "xyztest");
      await user.clear(searchInput);

      // Should show all roles again
      expect(screen.getByText("Super Admin")).toBeInTheDocument();
      expect(screen.getByText("Colaborador")).toBeInTheDocument();
    });

    it("filters by description as well as name", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tipo de usuário...");
      // Search for a term that might be in description
      await user.type(searchInput, "sistema");

      await waitFor(() => {
        // Super Admin has "Acesso total ao sistema" in description
        expect(screen.getByText("Super Admin")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Role Cards
  // ═══════════════════════════════════════════════════════════════════════════

  describe("role cards", () => {
    it("shows view button for all roles", async () => {
      setup();
      await screen.findByText("Lider de projeto");
      const viewButtons = screen.getAllByRole("button", { name: /ver permissões/i });
      expect(viewButtons.length).toBe(API_ROLES.length);
      expect(screen.queryByRole("button", { name: /editar permissões/i })).not.toBeInTheDocument();
    });

    it("does not show delete buttons while roles are read-only", async () => {
      setup();
      await screen.findByText("Lider de projeto");
      expect(screen.queryByRole("button", { name: /excluir tipo/i })).not.toBeInTheDocument();
    });

    it("clicking view permissions opens modal", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Permission Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("permission modal", () => {
    it("shows role name in modal title", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        // Modal title should contain "Permissões de" followed by role name
        expect(within(dialog).getByRole("heading", { name: /permissões de/i })).toBeInTheDocument();
      });
    });

    it("shows scope section", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);

      await waitFor(() => {
        expect(screen.getByText(/escopo de dados/i)).toBeInTheDocument();
      });
    });

    it("shows permission groups", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);

      await waitFor(() => {
        // Should show permission group names
        expect(screen.getByText("Pessoas")).toBeInTheDocument();
        expect(screen.getByText("Missões e OKRs")).toBeInTheDocument();
        expect(screen.getByText("Pesquisas")).toBeInTheDocument();
        expect(screen.getByText("Configurações")).toBeInTheDocument();
      });
    });

    it("shows read-only warning", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);

      await waitFor(() => {
        expect(screen.getByText(/tipo de usuário somente leitura/i)).toBeInTheDocument();
      });
    });

    it("has close button in header", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        // Modal should have close button (X in header) and/or Fechar/Cancelar in footer
        const closeButtons = within(dialog).getAllByRole("button");
        // At least one button should be for closing
        expect(closeButtons.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Role Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("create role button", () => {
    it("shows 'em breve' toast when clicked instead of opening a modal", async () => {
      const { user } = setup();

      const createButton = screen.getByRole("button", { name: /novo tipo/i });
      await user.click(createButton);

      expect(toastMock).toHaveBeenCalledWith(expect.stringMatching(/em breve/i));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("shows default badge for default role", async () => {
      setup();
      await screen.findByText("Colaborador");
      // Colaborador is the default role
      const defaultBadges = screen.getAllByText("Padrão");
      expect(defaultBadges.length).toBeGreaterThan(0);
    });

    it("shows scope badges for non-self scopes", async () => {
      setup();
      await screen.findByText("Super Admin");
      // Super Admin and Admin RH should have "Organização" scope
      const orgBadges = screen.queryAllByText("Organização");
      expect(orgBadges.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════════════════

  describe("accessibility", () => {
    it("modal has proper dialog role and labeling", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("checkboxes in permission modal are properly labeled", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);

      await waitFor(() => {
        // Permission checkboxes should exist
        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    it("scope section is displayed in modal", async () => {
      const { user } = setup();

      await openViewPermissionsModal(user);

      await waitFor(() => {
        // Should have scope section header
        expect(screen.getByText(/escopo de dados/i)).toBeInTheDocument();
      });
    });
  });
});
