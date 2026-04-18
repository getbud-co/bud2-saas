import { Card, CardBody, CardDivider, Skeleton, SKELETON_HEIGHTS } from "@getbud-co/buds";
import styles from "./SurveysSkeleton.module.css";

export function SurveysPageSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando">
      {/* PageHeader */}
      <div className={styles.pageHeader}>
        <Skeleton variant="text" width={160} height={SKELETON_HEIGHTS.heading} />
      </div>

      <Card padding="sm">
        <CardBody>
          {/* FilterBar + actions */}
          <div className={styles.toolbar}>
            <div className={styles.filterBar}>
              <Skeleton variant="rounded" width={100} height={32} />
              <Skeleton variant="rounded" width={80} height={32} />
              <Skeleton variant="rounded" width={110} height={32} />
            </div>
            <Skeleton variant="rounded" width={140} height={SKELETON_HEIGHTS.button} />
          </div>

          <CardDivider />

          {/* Indicator metrics (4 cards) */}
          <div className={styles.metrics}>
            {[
              { labelW: 110, valueW: 24 },
              { labelW: 130, valueW: 50 },
              { labelW: 140, valueW: 20 },
              { labelW: 120, valueW: 36 },
            ].map((m, i) => (
              <div key={i} className={styles.metricCard}>
                <div className={styles.metricIcon}>
                  <Skeleton variant="circular" width={32} height={32} />
                </div>
                <div className={styles.metricContent}>
                  <Skeleton variant="text" width={m.labelW} height={10} />
                  <Skeleton variant="text" width={m.valueW} height={24} />
                </div>
              </div>
            ))}
          </div>

          <CardDivider />

          {/* Table header */}
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              <Skeleton variant="text" width={140} height={SKELETON_HEIGHTS.subheading} />
              <Skeleton variant="rounded" width={28} height={20} />
            </div>
            <Skeleton variant="rounded" width={200} height={SKELETON_HEIGHTS.input} />
          </div>

          {/* Table head */}
          <div className={styles.tableHead}>
            <Skeleton variant="text" width="30%" height={12} />
            <Skeleton variant="text" width="12%" height={12} />
            <Skeleton variant="text" width="15%" height={12} />
            <Skeleton variant="text" width="20%" height={12} />
            <Skeleton variant="text" width="10%" height={12} />
            <Skeleton variant="text" width="8%" height={12} />
          </div>

          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.tableRow}>
              <div className={styles.tableCell} style={{ width: "30%" }}>
                <Skeleton variant="text" width={`${90 - i * 5}%`} height={SKELETON_HEIGHTS.text} />
              </div>
              <div className={styles.tableCell} style={{ width: "12%" }}>
                <Skeleton variant="rounded" width={70} height={22} />
              </div>
              <div className={styles.tableCell} style={{ width: "15%" }}>
                <Skeleton variant="text" width={100} height={SKELETON_HEIGHTS.text} />
              </div>
              <div className={styles.tableCell} style={{ width: "20%" }}>
                <Skeleton variant="rounded" width="80%" height={8} />
              </div>
              <div className={styles.tableCell} style={{ width: "10%" }}>
                <Skeleton variant="rounded" width={64} height={22} />
              </div>
              <div className={styles.tableCell} style={{ width: "8%" }}>
                <Skeleton variant="rounded" width={28} height={28} />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
