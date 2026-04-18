/**
 * Tests for ActivitiesCard
 *
 * Card showing a list of pending activities with navigation support.
 * Receives activities and allActivities via props.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { ActivitiesCard } from "./ActivitiesCard";
import type { HomeActivityItem } from "../hooks/useHomeMissionReadModel";

// ─── Test Data ───

function makeActivity(overrides: Partial<HomeActivityItem> = {}): HomeActivityItem {
  return {
    title: "Atualizar missão: OKR Alpha",
    subtitle: "Progresso atual 30% (esperado 50%)",
    urgent: false,
    category: "Missões",
    route: "/missions",
    routeState: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const DEFAULT_ACTIVITIES: HomeActivityItem[] = [
  makeActivity({ title: "Atualizar missão: OKR Alpha", category: "Missões" }),
  makeActivity({ title: "Responder pesquisa NPS", category: "Pesquisas" }),
];

const ALL_ACTIVITIES: HomeActivityItem[] = [
  ...DEFAULT_ACTIVITIES,
  makeActivity({ title: "Check-in semanal", category: "Check-ins" }),
  makeActivity({ title: "Revisar PDI", category: "Pessoas" }),
];

// ─── Test Helpers ───

function setup(props?: Partial<{ activities: HomeActivityItem[]; allActivities: HomeActivityItem[]; onMissionCheckin: (krId: string) => void }>) {
  const user = userEvent.setup();
  const result = renderWithProviders(
    <ActivitiesCard
      activities={props?.activities ?? DEFAULT_ACTIVITIES}
      allActivities={props?.allActivities ?? ALL_ACTIVITIES}
      onMissionCheckin={props?.onMissionCheckin}
    />,
  );
  return { user, ...result };
}

// ─── Tests ───

describe("ActivitiesCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      setup();
      expect(screen.getByText("Minhas atividades")).toBeInTheDocument();
    });

    it("displays the card title", () => {
      setup();
      expect(screen.getByText("Minhas atividades")).toBeInTheDocument();
    });

    it("displays the pending count badge", () => {
      setup();
      expect(screen.getByText("4 pendentes")).toBeInTheDocument();
    });

    it("renders each activity title", () => {
      setup();
      expect(screen.getByText("Atualizar missão: OKR Alpha")).toBeInTheDocument();
      expect(screen.getByText("Responder pesquisa NPS")).toBeInTheDocument();
    });

    it("renders the expand button", () => {
      setup();
      expect(screen.getByRole("button", { name: "Expandir" })).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("activity items are clickable (role=button)", () => {
      setup();
      const items = screen.getAllByRole("button", { name: /atualizar missão|responder pesquisa/i });
      // Each activity item with an onClick handler gets role="button"
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it("calls onMissionCheckin when clicking a mission activity with openCheckinKrId", async () => {
      const onMissionCheckin = vi.fn();
      const activities = [
        makeActivity({
          title: "Atualizar missão: OKR Beta",
          category: "Missões",
          routeState: { openCheckinKrId: "kr-123" },
        }),
      ];
      const { user } = setup({ activities, allActivities: activities, onMissionCheckin });
      const item = screen.getByText("Atualizar missão: OKR Beta").closest("[role='button']")!;
      await user.click(item);
      expect(onMissionCheckin).toHaveBeenCalledWith("kr-123");
    });
  });

  describe("empty state", () => {
    it("renders with zero activities without crashing", () => {
      setup({ activities: [], allActivities: [] });
      expect(screen.getByText("Minhas atividades")).toBeInTheDocument();
      expect(screen.getByText("0 pendentes")).toBeInTheDocument();
    });
  });
});
