import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  GoalProgressBar,
  DropdownButton,
  Button,
} from "@getbud-co/buds";
import type { DropdownItem } from "@getbud-co/buds";
import { ArrowsOutSimple, Users } from "@phosphor-icons/react";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import styles from "./MissionsCard.module.css";

export interface KeyResultSummary {
  label: string;
  value: number;
  expected: number;
  target: number;
  owner: string;
  status: "on-track" | "attention" | "off-track";
}

interface MissionsCardProps {
  title: string;
  value: number;
  expected: number;
  target: number;
  showTeamFilter?: boolean;
  keyResults?: KeyResultSummary[];
  /** Route to navigate when expanding */
  expandRoute: string;
}

const ALL_TEAMS_OPTION: DropdownItem = { id: "all", label: "Todos os times" };

export function MissionsCard({
  title,
  value,
  expected,
  target,
  showTeamFilter,
  expandRoute,
}: MissionsCardProps) {
  const navigate = useNavigate();
  const { teamOptions } = usePeopleData();
  const [selectedTeam, setSelectedTeam] = useState<DropdownItem>(ALL_TEAMS_OPTION);

  const teams: DropdownItem[] = useMemo(() => [
    ALL_TEAMS_OPTION,
    ...teamOptions.map((t) => ({ id: t.id, label: t.label })),
  ], [teamOptions]);

  const action = (
    <div className={styles.actions}>
      {showTeamFilter && teams.length > 1 && (
        <DropdownButton
          items={teams}
          onSelect={setSelectedTeam}
          leftIcon={Users}
          variant="secondary"
          size="sm"
          searchable
          searchPlaceholder="Buscar time..."
        >
          {selectedTeam?.label ?? "Todos os times"}
        </DropdownButton>
      )}
      <Button
        variant="tertiary"
        size="sm"
        leftIcon={ArrowsOutSimple}
        aria-label="Expandir"
        onClick={() => navigate(expandRoute)}
      />
    </div>
  );

  return (
    <Card padding="sm">
      <CardHeader title={title} action={action} />
      <CardBody>
        <GoalProgressBar
          label=""
          value={value}
          target={target}
          expected={expected}
          formattedValue={`${value}%`}
        />
        <p className={styles.expected}>Esperado {expected}%</p>
      </CardBody>
    </Card>
  );
}
