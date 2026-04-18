import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
} from "@getbud-co/buds";
import {
  Table,
  ChartDonut,
  ChatCircleDots,
  Lightning,
  CaretRight,
  ArrowsOutSimple,
  UserCircle,
  CalendarCheck,
  Megaphone,
} from "@phosphor-icons/react";
import type { HomeActivityItem } from "../hooks/useHomeMissionReadModel";
import styles from "./ActivitiesCard.module.css";

interface Activity extends HomeActivityItem {
  icon: React.ComponentType<{ size?: number }>;
}

function iconByCategory(category: string): React.ComponentType<{ size?: number }> {
  switch (category) {
    case "Pesquisas":
      return Table;
    case "Missões":
      return ChartDonut;
    case "Check-ins":
      return ChatCircleDots;
    case "IA":
      return Lightning;
    case "Pessoas":
      return UserCircle;
    case "1:1":
      return CalendarCheck;
    case "Reconhecimento":
      return Megaphone;
    default:
      return Table;
  }
}

function toActivity(input: HomeActivityItem): Activity {
  return {
    ...input,
    icon: iconByCategory(input.category),
  };
}

function ActivityItem({ activity, onClick }: { activity: Activity; onClick?: () => void }) {
  return (
    <li
      className={styles.item}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    >
      <div className={styles.iconBox}>
        <activity.icon size={16} />
      </div>
      <div className={styles.text}>
        <p className={styles.title}>{activity.title}</p>
        <p className={activity.urgent ? styles.subtitleUrgent : styles.subtitle}>
          {activity.subtitle}
        </p>
      </div>
      <CaretRight size={16} className={styles.caret} />
    </li>
  );
}

interface ActivitiesCardProps {
  activities: HomeActivityItem[];
  allActivities: HomeActivityItem[];
  onMissionCheckin?: (krId: string) => void;
}

export function ActivitiesCard({ activities: activitiesInput, allActivities: allActivitiesInput, onMissionCheckin }: ActivitiesCardProps) {
  const navigate = useNavigate();

  const activities = activitiesInput.map(toActivity);
  const allActivities = allActivitiesInput.map(toActivity);

  function handleNavigate(activity: Activity) {
    const krId = activity.routeState?.openCheckinKrId as string | undefined;
    if (onMissionCheckin && krId) {
      onMissionCheckin(krId);
      return;
    }
    navigate(activity.route, { state: activity.routeState });
  }

  const action = (
    <div className={styles.actions}>
      <Badge color="neutral" size="sm">
        {allActivities.length} pendentes
      </Badge>
      <Button
        variant="tertiary"
        size="sm"
        leftIcon={ArrowsOutSimple}
        aria-label="Expandir"
        onClick={() => navigate("/home/activities")}
      />
    </div>
  );

  return (
    <Card padding="sm">
      <CardHeader title="Minhas atividades" action={action} />
      <CardBody>
        <ul className={styles.list}>
          {activities.map((activity, i) => (
            <ActivityItem key={i} activity={activity} onClick={() => handleNavigate(activity)} />
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
