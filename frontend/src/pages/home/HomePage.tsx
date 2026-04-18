import { useState } from "react";
import { Badge, Button, Tooltip } from "@getbud-co/buds";
import { Fire, Plus } from "@phosphor-icons/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { BriefingCard } from "./components/BriefingCard";
import { MissionsCard } from "./components/MissionsCard";
import { EngagementCard } from "./components/EngagementCard";
import { ActivitiesCard } from "./components/ActivitiesCard";
import { TeamHealthCard } from "./components/TeamHealthCard";
import { WidgetBuilder } from "./components/WidgetBuilder";
import { QuickCheckinDrawer } from "./components/QuickCheckinDrawer";
import { useHomeActivities } from "./hooks/useHomeActivities";
import styles from "./HomePage.module.css";

export function HomePage() {
  const greeting = getGreeting();
  const [widgetBuilderOpen, setWidgetBuilderOpen] = useState(false);
  const [checkinKrId, setCheckinKrId] = useState<string | null>(null);
  const { activities, allActivities, readModel } = useHomeActivities();
  const { currentUser } = usePeopleData();
  const userName = currentUser?.label.split(" ")[0] ?? "Usuário";

  return (
    <div className={styles.page}>
      <PageHeader title={`${greeting}, ${userName}!`}>
        <Tooltip content="Check-in semanal: 7 semanas consecutivas. Próximo badge: 12 semanas (faltam 5)">
          <Badge color="orange" size="sm" leftIcon={Fire}>7 sem.</Badge>
        </Tooltip>
      </PageHeader>

      <BriefingCard />

      <div className={styles.grid}>
        <div className={styles.colLeft}>
          <MissionsCard
            title={readModel.annual.label}
            value={readModel.annual.value}
            expected={readModel.annual.expected}
            target={readModel.annual.target}
            keyResults={readModel.annual.keyResults}
            expandRoute="/missions/annual"
          />
          <MissionsCard
            title={readModel.quarter.label}
            value={readModel.quarter.value}
            expected={readModel.quarter.expected}
            target={readModel.quarter.target}
            keyResults={readModel.quarter.keyResults}
            showTeamFilter
            expandRoute="/missions/quarterly"
          />
          <EngagementCard />
          <Button variant="secondary" size="sm" leftIcon={Plus} onClick={() => setWidgetBuilderOpen(true)}>
            Adicionar widget
          </Button>
        </div>

        <div className={styles.colRight}>
          <ActivitiesCard activities={activities} allActivities={allActivities} onMissionCheckin={setCheckinKrId} />
          <TeamHealthCard />
        </div>
      </div>

      <WidgetBuilder
        open={widgetBuilderOpen}
        onClose={() => setWidgetBuilderOpen(false)}
      />

      <QuickCheckinDrawer
        open={!!checkinKrId}
        onClose={() => setCheckinKrId(null)}
        keyResultId={checkinKrId}
      />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
