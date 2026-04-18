import { Link } from "react-router-dom";
import {
  Badge,
  Accordion,
  AccordionItem,
} from "@getbud-co/buds";
import { Lightning, ArrowRight } from "@phosphor-icons/react";
import { useBriefingReadModel } from "../hooks/useBriefingReadModel";
import { formatWeekdayDate } from "@/lib/date-format";
import styles from "./BriefingCard.module.css";

export function BriefingCard() {
  const briefingItems = useBriefingReadModel();

  const formatted = formatWeekdayDate();

  // Count urgent items for the badge
  const urgentCount = briefingItems.filter((i) => i.priority === "high").length;

  return (
    <Accordion header>
      <AccordionItem
        icon={Lightning}
        title="Briefing do dia"
        description={formatted}
        action={
          urgentCount > 0 ? (
            <Badge color="error" size="sm">
              {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge color="success" size="sm">
              Em dia
            </Badge>
          )
        }
      >
        <div className={styles.content}>
          {briefingItems.map((item) => {
            const Icon = item.icon;
            const hasAction = !!item.action?.href;

            const itemContent = (
              <>
                <span className={`${styles.indicator} ${styles[`indicator--${item.priority}`]}`} />
                <span className={`${styles.icon} ${styles[`icon--${item.priority}`]}`}>
                  <Icon size={16} />
                </span>
                <span className={styles.text}>{item.text}</span>
                {hasAction && (
                  <span className={styles.action}>
                    {item.action!.label}
                    <ArrowRight size={14} />
                  </span>
                )}
              </>
            );

            if (hasAction) {
              return (
                <Link
                  key={item.id}
                  to={item.action!.href!}
                  className={styles.item}
                >
                  {itemContent}
                </Link>
              );
            }

            return (
              <div key={item.id} className={styles.item}>
                {itemContent}
              </div>
            );
          })}
        </div>
      </AccordionItem>
    </Accordion>
  );
}
