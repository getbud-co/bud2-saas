import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Avatar,
} from "@getbud-co/buds";
import {
  ArrowsOutSimple,
  CaretRight,
} from "@phosphor-icons/react";
import { useTeamOverviewData } from "@/hooks/useTeamOverviewData";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { CollaboratorProfileModal } from "@/pages/my-team/modules/components/CollaboratorProfileModal";
import type { HealthStatus, UserEngagementSummary } from "@/types/engagement";
import styles from "./TeamHealthCard.module.css";

// ── Badge config ────────────────────────────────────────────────────────────

const HEALTH_BADGE: Record<HealthStatus, { color: "success" | "warning" | "error"; label: string }> = {
  healthy:   { color: "success", label: "Bem"     },
  attention: { color: "warning", label: "Atenção" },
  critical:  { color: "error",   label: "Crítico" },
};

const counterColor: Record<HealthStatus, string> = {
  healthy: "good",
  attention: "warn",
  critical: "bad",
};

// ── Summary cards ───────────────────────────────────────────────────────────

interface HealthSummary {
  count: number;
  label: string;
  status: HealthStatus;
}

function SummaryCards({ data }: { data: HealthSummary[] }) {
  return (
    <div className={styles.summaryRow}>
      {data.map((s) => (
        <Card key={s.status} padding="sm">
          <CardBody>
            <div className={styles.counterBody}>
              <span className={`${styles.counterValue} ${styles[counterColor[s.status]]}`}>
                {s.count}
              </span>
              <span className={styles.counterLabel}>{s.label}</span>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ── Member row ──────────────────────────────────────────────────────────────

function MemberRow({ member, onClick }: { member: UserEngagementSummary; onClick?: () => void }) {
  const badge = HEALTH_BADGE[member.healthStatus];

  return (
    <li
      className={`${styles.memberItem} ${onClick ? styles.memberItemClickable : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    >
      <Avatar initials={member.initials} size="sm" src={member.avatarUrl ?? undefined} />
      <div className={styles.memberText}>
        <span className={styles.memberName}>{member.name}</span>
        <span className={styles.memberDetail}>{member.jobTitle ?? "Colaborador"}</span>
      </div>
      <Badge color={badge.color} size="sm">
        {badge.label}
      </Badge>
      <CaretRight size={16} className={styles.caretRight} />
    </li>
  );
}

// ── TeamHealthCard ──────────────────────────────────────────────────────────

export function TeamHealthCard() {
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState<UserEngagementSummary | null>(null);

  // Show teams the current user leads (same logic as Meu Time default)
  const { teams: allTeams, currentUserId } = usePeopleData();
  const myTeamIds = useMemo(() => {
    const led = allTeams.filter((t) => t.leaderId === currentUserId).map((t) => t.id);
    return led.length > 0 ? led : allTeams.length > 0 ? [allTeams[0]!.id] : [];
  }, [allTeams, currentUserId]);
  const { memberEngagements } = useTeamOverviewData(myTeamIds);

  // Summary counts
  const summaries: HealthSummary[] = useMemo(() => [
    { count: memberEngagements.filter((m) => m.healthStatus === "healthy").length, label: "Bem", status: "healthy" as const },
    { count: memberEngagements.filter((m) => m.healthStatus === "attention").length, label: "Atenção", status: "attention" as const },
    { count: memberEngagements.filter((m) => m.healthStatus === "critical").length, label: "Crítico", status: "critical" as const },
  ], [memberEngagements]);

  // Preview: 1 of each status first, then fill to 5
  const previewMembers = useMemo(() => {
    const critical = memberEngagements.filter((m) => m.healthStatus === "critical");
    const attention = memberEngagements.filter((m) => m.healthStatus === "attention");
    const healthy = memberEngagements.filter((m) => m.healthStatus === "healthy");
    const preview: UserEngagementSummary[] = [];
    if (critical.length > 0) preview.push(critical[0]!);
    if (attention.length > 0) preview.push(attention[0]!);
    if (healthy.length > 0) preview.push(healthy[0]!);
    const ids = new Set(preview.map((m) => m.userId));
    for (const m of memberEngagements) {
      if (preview.length >= 5) break;
      if (!ids.has(m.userId)) { preview.push(m); ids.add(m.userId); }
    }
    return preview;
  }, [memberEngagements]);

  const action = (
    <Button
      variant="tertiary"
      size="sm"
      leftIcon={ArrowsOutSimple}
      aria-label="Expandir"
      onClick={() => navigate("/my-team")}
    />
  );

  return (
    <>
      <Card padding="sm">
        <CardHeader title="Meu time" action={action} />
        <CardBody>
          <SummaryCards data={summaries} />
          <ul className={styles.memberList}>
            {previewMembers.map((member) => (
              <MemberRow key={member.userId} member={member} onClick={() => setSelectedMember(member)} />
            ))}
          </ul>
        </CardBody>
      </Card>

      {selectedMember && (
        <CollaboratorProfileModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}
