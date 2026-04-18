import { useMemo } from "react";
import { useHomeMissionReadModel, type HomeActivityItem } from "./useHomeMissionReadModel";
import { useSurveysData } from "@/contexts/SurveysDataContext";
import { useActivityData } from "@/contexts/ActivityDataContext";
import { usePeopleData } from "@/contexts/PeopleDataContext";

/**
 * Combina atividades de múltiplas fontes (missões, pesquisas, check-ins)
 * para gerar a lista completa de atividades pendentes do usuário.
 */
export function useHomeActivities() {
  const readModel = useHomeMissionReadModel();
  const { surveys } = useSurveysData();
  const { activities: userActivities } = useActivityData();
  const { currentUserId } = usePeopleData();

  const activities = useMemo(() => {
    const all: HomeActivityItem[] = [];

    // 1. Mission activities from urgent KRs
    all.push(...readModel.activities);

    // 2. Active surveys the current user hasn't responded to
    const activeSurveys = surveys.filter((s) => s.status === "active");
    for (const survey of activeSurveys) {
      // Check if current user has completed this survey
      const hasResponded = userActivities.some(
        (a) =>
          a.type === "survey_complete" &&
          a.entityId === survey.id &&
          a.userId === currentUserId,
      );

      if (!hasResponded) {
        const endDate = survey.endDate
          ? new Date(survey.endDate).toLocaleDateString("pt-BR")
          : null;

        all.push({
          title: `Responder formulário: ${survey.name}`,
          subtitle: endDate
            ? `Data limite para responder: ${endDate}`
            : "Sem data limite definida",
          category: "Pesquisas",
          route: "/surveys",
          createdAt: survey.createdAt ?? null,
        });
      }
    }

    // 3. Check if last check-in was >5 days ago
    if (currentUserId) {
      const checkInActivities = userActivities
        .filter((a) => a.type === "checkin_create" && a.userId === currentUserId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const lastCheckIn = checkInActivities[0];
      const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;

      if (!lastCheckIn || new Date(lastCheckIn.createdAt).getTime() < fiveDaysAgo) {
        all.push({
          title: "Fazer check-in semanal",
          subtitle: lastCheckIn
            ? `Último check-in: ${new Date(lastCheckIn.createdAt).toLocaleDateString("pt-BR")}`
            : "Nenhum check-in registrado ainda",
          category: "Check-ins",
          route: "/missions",
          createdAt: lastCheckIn?.createdAt ?? new Date().toISOString(),
        });
      }
    }

    // Sort: urgent first, then by category
    all.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return a.category.localeCompare(b.category);
    });

    return all;
  }, [readModel.activities, surveys, userActivities, currentUserId]);

  const preview = useMemo(() => activities.slice(0, 4), [activities]);

  return {
    activities: preview,
    allActivities: activities,
    readModel,
  };
}
