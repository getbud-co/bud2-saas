import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import {
  PageHeader as DsPageHeader,
  SearchButton,
  NotificationButton,
  AssistantButton,
  Button,
  CommandPalette,
  NotificationPanel,
} from "@getbud-co/buds";
import type { CommandGroup, NotificationItem } from "@getbud-co/buds";
import {
  List,
  House,
  Target,
  ListChecks,
  Users,
  GearSix,
  CalendarCheck,
  Trophy,
  WarningCircle,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useAssistant } from "@/contexts/AssistantContext";
import { useSidebar } from "@/contexts/SidebarContext";
import styles from "./PageHeader.module.css";

const COMMAND_GROUPS: CommandGroup[] = [
  {
    label: "Navegação",
    items: [
      { id: "/home", label: "Início", icon: House },
      { id: "/missions", label: "Missões", icon: Target },
      { id: "/surveys", label: "Pesquisas", icon: ListChecks },
      { id: "/my-team", label: "Meu Time", icon: Users },
      { id: "/settings", label: "Configurações", icon: GearSix },
    ],
  },
];

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    icon: WarningCircle,
    title: "Engajamento em queda",
    description: "Ana Ferreira apresenta queda de 23% no engajamento.",
    time: "há 2h",
    unread: true,
  },
  {
    id: "2",
    icon: CalendarCheck,
    title: "1:1 com Lucas às 14h",
    description: "Pontos sugeridos: OKR de retenção e feedback.",
    time: "há 3h",
    unread: true,
  },
  {
    id: "3",
    icon: Trophy,
    title: "Reconhecimentos em alta",
    description: "Sua equipe deu 12 reconhecimentos esta semana (+40%).",
    time: "há 5h",
    unread: false,
  },
];

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const navigate = useNavigate();
  const { open: assistantOpen, toggle: toggleAssistant } = useAssistant();
  const { isMobile, openSidebar } = useSidebar();

  const [searchOpen, setSearchOpen] = useState(false);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const hasUnread = NOTIFICATIONS.some((n) => n.unread);

  return (
    <div>
      <div className={styles.headerRow}>
        {isMobile && (
          <Button
            variant="tertiary"
            size="md"
            leftIcon={List}
            aria-label="Abrir menu"
            onClick={openSidebar}
          />
        )}
        <DsPageHeader title={title} className={styles.headerInner}>
          {children}
          <SearchButton onClick={() => setSearchOpen(true)} className={styles.searchBtn} />
          <NotificationButton
            ref={notifBtnRef}
            hasUnread={hasUnread}
            onClick={() => setNotifOpen((v) => !v)}
          />
          <AssistantButton active={assistantOpen} onClick={toggleAssistant} />
        </DsPageHeader>
      </div>
      {description && <p className={styles.description}>{description}</p>}

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(id) => {
          setSearchOpen(false);
          navigate(id);
        }}
        groups={COMMAND_GROUPS}
        placeholder="Buscar páginas, pessoas, OKRs..."
      />

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        anchorRef={notifBtnRef}
        notifications={NOTIFICATIONS}
        onClickItem={() => setNotifOpen(false)}
        onMarkAllRead={() => {}}
        onViewAll={() => setNotifOpen(false)}
      />
    </div>
  );
}
