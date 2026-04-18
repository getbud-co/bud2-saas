import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  DropdownButton,
  Button,
  Chart,
} from "@getbud-co/buds";
import type { DropdownItem } from "@getbud-co/buds";
import { TrendUp, TrendDown, Users, ArrowsOutSimple } from "@phosphor-icons/react";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { useTeamOverviewData } from "@/hooks/useTeamOverviewData";
import styles from "./EngagementCard.module.css";

export function EngagementCard() {
  const navigate = useNavigate();
  const { teams: allTeams, currentUserId } = usePeopleData();

  // Default to teams led by current user
  const defaultTeamId = useMemo(() => {
    const led = allTeams.find((t) => t.leaderId === currentUserId);
    return led?.id ?? "all";
  }, [allTeams, currentUserId]);

  const [selectedTeamId, setSelectedTeamId] = useState(defaultTeamId);

  const teams: DropdownItem[] = useMemo(
    () => [
      { id: "all", label: "Todos os times" },
      ...allTeams.map((t) => ({ id: t.id, label: t.name })),
    ],
    [allTeams],
  );

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? teams[0];

  // Same data source as Meu Time > Visão Geral
  const selectedTeamIds = useMemo(
    () => selectedTeamId === "all" ? allTeams.map((t) => t.id) : [selectedTeamId],
    [selectedTeamId, allTeams],
  );
  const { teamEngagement } = useTeamOverviewData(selectedTeamIds);

  const engagementScore = Math.round(teamEngagement?.avgEngagementScore ?? 0);
  const engagementTrend = teamEngagement?.engagementTrend ?? "stable";
  const TrendIcon = engagementTrend === "up" ? TrendUp : TrendDown;

  const action = (
    <div className={styles.actions}>
      <DropdownButton
        items={teams}
        onSelect={(item) => setSelectedTeamId(item.id)}
        leftIcon={Users}
        variant="secondary"
        size="sm"
        searchable
        searchPlaceholder="Buscar time..."
      >
        {selectedTeam?.label}
      </DropdownButton>
      <Button
        variant="tertiary"
        size="sm"
        leftIcon={ArrowsOutSimple}
        aria-label="Expandir"
        onClick={() => navigate("/home/engagement")}
      />
    </div>
  );

  return (
    <Card padding="sm">
      <CardHeader title="Engajamento" action={action} />
      <CardBody>
        <div className={styles.content}>
          <Chart value={engagementScore} variant="half" size={120} />
          <div className={styles.trendRow}>
            <span className={styles.trendText}>
              {engagementTrend === "stable"
                ? "Engajamento estável essa semana"
                : `Engajamento ${engagementTrend === "up" ? "subiu" : "caiu"} essa semana`}
            </span>
            {engagementTrend !== "stable" && <TrendIcon size={16} />}
          </div>
          <p className={styles.hint}>
            Para melhorar, apoie o time a atualizar as missões e responder os
            formulários
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
