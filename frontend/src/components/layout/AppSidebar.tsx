import { useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Sidebar,
  SidebarHeader,
  SidebarOrgSwitcher,
  SidebarDivider,
  SidebarNav,
  SidebarGroup,
  SidebarItem,
  SidebarSubItem,
  SidebarFooter,
  SidebarUser,
  Avatar,
  Popover,
} from "@getbud-co/buds";
import type { PopoverItem } from "@getbud-co/buds";
import {
  House,
  Target,
  ListChecks,
  GearSix,
  Lifebuoy,
  UsersThree,
  Lightning,
  UserCircle,
  SignOut,
  Plus,
} from "@phosphor-icons/react";
import { BudLogo, BudLogoMark } from "@/components/BudLogo";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import { useSavedViews } from "@/contexts/SavedViewsContext";
import { useConfigData } from "@/contexts/ConfigDataContext";
import { useAuth } from "@/contexts/AuthContext";

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { views } = useSavedViews();
  const { organizations, activeOrganization, setActiveOrgId } = useConfigData();
  const { logout, user: authUser } = useAuth();
  const activeViewId = searchParams.get("view");

  const sidebarUserName = authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() : "Usuário";
  const sidebarUserInitials = authUser
    ? `${authUser.first_name[0] ?? ""}${authUser.last_name[0] ?? ""}`.toUpperCase() || "??"
    : "??";

  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLButtonElement>(null);

  const userMenu: PopoverItem[] = [
    { id: "profile", label: "Minha conta", icon: UserCircle, onClick: () => { setUserOpen(false); navigate("/account"); } },
    { id: "logout", label: "Sair", icon: SignOut, danger: true, onClick: () => { setUserOpen(false); logout(); } },
  ];

  const [orgOpen, setOrgOpen] = useState(false);
  const orgRef = useRef<HTMLButtonElement>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const orgItems = organizations.map((org) => ({
    id: org.id,
    label: org.name,
    image: org.logoUrl ?? "https://ui-avatars.com/api/?name=" + encodeURIComponent(org.name) + "&background=0EA5E9&color=fff&size=48&font-size=0.4&bold=true",
  }));

  const orgMenuItems: PopoverItem[] = [
    ...orgItems.map((org) => ({
      id: org.id,
      label: org.label,
      image: org.image,
      onClick: () => {
        setActiveOrgId(org.id);
        setOrgOpen(false);
      },
    })),
    {
      id: "add-org",
      label: "Adicionar empresa",
      icon: Plus,
      divider: true,
      onClick: () => {
        setOrgOpen(false);
        setPlanModalOpen(true);
      },
    },
  ];

  function isActive(path: string) {
    return (
      location.pathname === path ||
      location.pathname.startsWith(path + "/")
    );
  }

  /* Forces re-mount of expandable items when the active top-level section changes,
     so that only the active section stays expanded. */
  const activeSection = "/" + (location.pathname.split("/")[1] ?? "");

  return (
    <>
    <Sidebar collapsed={collapsed} onCollapse={onToggleCollapse} mobileOpen={mobileOpen} onMobileClose={onMobileClose}>
      <SidebarHeader>
        {collapsed && !mobileOpen ? (
          <BudLogoMark height={22} style={{ cursor: "pointer" }} onClick={() => navigate("/home")} />
        ) : (
          <BudLogo height={28} style={{ cursor: "pointer" }} onClick={() => navigate("/home")} />
        )}
      </SidebarHeader>

      <SidebarOrgSwitcher
        ref={orgRef}
        image={activeOrganization?.logoUrl ?? orgItems[0]?.image}
        label={activeOrganization?.name ?? orgItems[0]?.label ?? ""}
        onClick={() => setOrgOpen((v) => !v)}
      />
      <Popover
        items={orgMenuItems}
        open={orgOpen}
        onClose={() => setOrgOpen(false)}
        anchorRef={orgRef}
      />

      <SidebarDivider />

      <SidebarNav>
        {/* ── Performance e Engajamento ── */}
        <SidebarGroup label="Performance e Engajamento">
          <SidebarItem
            icon={House}
            label="Início"
            active={location.pathname === "/home"}
            onClick={() => navigate("/home")}
          />
          <SidebarItem
            key={`missions-${activeSection}`}
            icon={Target}
            label="Missões"
            active={isActive("/missions")}
            defaultExpanded={isActive("/missions")}
          >
            <SidebarSubItem
              active={location.pathname === "/missions" && !activeViewId && !new URLSearchParams(location.search).has("filter")}
              onClick={() => navigate("/missions")}
            >
              Todas as missões
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/missions/mine")}
              onClick={() => navigate("/missions/mine")}
            >
              Minhas missões
            </SidebarSubItem>
            {views
              .filter((v) => v.module === "missions")
              .map((v) => (
                <SidebarSubItem
                  key={v.id}
                  active={activeViewId === v.id}
                  onClick={() => navigate(`/missions?view=${v.id}`)}
                >
                  {v.name}
                </SidebarSubItem>
              ))}
            <SidebarSubItem onClick={() => navigate("/missions", { state: { newView: true } })}>
              + Criar visualização
            </SidebarSubItem>
          </SidebarItem>
          <SidebarItem
            key={`surveys-${activeSection}`}
            icon={ListChecks}
            label="Pesquisas"
            active={isActive("/surveys")}
            defaultExpanded={location.pathname === "/surveys" || location.pathname.startsWith("/surveys/")}
          >
            <SidebarSubItem
              active={location.pathname === "/surveys" && !searchParams.get("view")}
              onClick={() => navigate("/surveys")}
            >
              Todas as pesquisas
            </SidebarSubItem>
            {views
              .filter((v) => v.module === "surveys")
              .map((v) => (
                <SidebarSubItem
                  key={v.id}
                  active={activeViewId === v.id}
                  onClick={() => navigate(`/surveys?view=${v.id}`)}
                >
                  {v.name}
                </SidebarSubItem>
              ))}
            <SidebarSubItem onClick={() => navigate("/surveys", { state: { newView: true } })}>
              + Criar visualização
            </SidebarSubItem>
          </SidebarItem>
          <SidebarItem
            key={`my-team-${activeSection}`}
            icon={UsersThree}
            label="Meu time"
            active={isActive("/my-team")}
            defaultExpanded={isActive("/my-team")}
          >
            <SidebarSubItem
              active={isActive("/my-team/overview")}
              onClick={() => navigate("/my-team/overview")}
            >
              Visão geral
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/my-team/org-chart")}
              onClick={() => navigate("/my-team/org-chart")}
            >
              Organograma
            </SidebarSubItem>
          </SidebarItem>
          <SidebarItem
            key={`assistant-${activeSection}`}
            icon={Lightning}
            label="Meu assistente"
            active={isActive("/assistant")}
            defaultExpanded={isActive("/assistant")}
          >
            <SidebarSubItem
              active={isActive("/assistant/chat") || location.pathname === "/assistant"}
              onClick={() => navigate("/assistant/chat")}
            >
              Conversas
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/assistant/customize")}
              onClick={() => navigate("/assistant/customize")}
            >
              Personalizar
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/assistant/company")}
              onClick={() => navigate("/assistant/company")}
            >
              Empresa
            </SidebarSubItem>
          </SidebarItem>
        </SidebarGroup>

        {/* ── Configurações ── */}
        <SidebarGroup label="Configurações">
          <SidebarItem
            key={`settings-${activeSection}`}
            icon={GearSix}
            label="Configurações"
            active={isActive("/settings")}
            defaultExpanded={isActive("/settings")}
          >
            <SidebarSubItem
              active={isActive("/settings/company")}
              onClick={() => navigate("/settings/company")}
            >
              Dados da empresa
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/settings/users")}
              onClick={() => navigate("/settings/users")}
            >
              Usuários
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/settings/teams")}
              onClick={() => navigate("/settings/teams")}
            >
              Times
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/settings/org-structure")}
              onClick={() => navigate("/settings/org-structure")}
            >
              Estrutura organizacional
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/settings/tags")}
              onClick={() => navigate("/settings/tags")}
            >
              Tags e organizadores
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/settings/cycles")}
              onClick={() => navigate("/settings/cycles")}
            >
              Ciclos
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/settings/survey-templates")}
              onClick={() => navigate("/settings/survey-templates")}
            >
              Templates de pesquisa
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/settings/integrations")}
              onClick={() => navigate("/settings/integrations")}
            >
              Integrações
            </SidebarSubItem>
            <SidebarSubItem
              active={isActive("/settings/roles")}
              onClick={() => navigate("/settings/roles")}
            >
              Tipos de usuário
            </SidebarSubItem>
          </SidebarItem>
          <SidebarItem
            icon={Lifebuoy}
            label="Ajuda"
            active={isActive("/help")}
            onClick={() => navigate("/help")}
          />
        </SidebarGroup>
      </SidebarNav>

      <SidebarFooter>
        <SidebarUser
          ref={userRef}
          name={sidebarUserName}
          role=""
          avatar={<Avatar initials={sidebarUserInitials} size="sm" />}
          onClick={() => setUserOpen((v) => !v)}
        />
        <Popover
          items={userMenu}
          open={userOpen}
          onClose={() => setUserOpen(false)}
          anchorRef={userRef}
        />
      </SidebarFooter>
    </Sidebar>

    <PlanSelectionModal open={planModalOpen} onClose={() => setPlanModalOpen(false)} />
    </>
  );
}
