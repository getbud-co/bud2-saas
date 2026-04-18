import { Card, CardBody, CardDivider, Skeleton, SKELETON_HEIGHTS } from "@getbud-co/buds";
import styles from "./MissionsSkeleton.module.css";

export function MissionsPageSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando">
      {/* PageHeader */}
      <div className={styles.pageHeader}>
        <Skeleton variant="text" width={200} height={SKELETON_HEIGHTS.heading} />
      </div>

      <Card padding="sm">
        <CardBody>
          {/* FilterBar + actions */}
          <div className={styles.toolbar}>
            <div className={styles.filterBar}>
              <Skeleton variant="rounded" width={120} height={32} />
              <Skeleton variant="rounded" width={100} height={32} />
              <Skeleton variant="rounded" width={90} height={32} />
            </div>
            <div className={styles.toolbarActions}>
              <Skeleton variant="rounded" width={140} height={32} />
              <Skeleton variant="rounded" width={130} height={SKELETON_HEIGHTS.button} />
            </div>
          </div>

          <CardDivider />

          {/* Summary metrics (3 cards) */}
          <div className={styles.metrics}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.metricCard}>
                <Skeleton variant="text" width={90} height={10} />
                <div className={styles.metricValue}>
                  <Skeleton variant="text" width={50} height={28} />
                  {i === 1 && <Skeleton variant="rounded" width="100%" height={8} />}
                </div>
              </div>
            ))}
          </div>

          <CardDivider />

          {/* Mission list */}
          <div className={styles.missionList}>
            {/* Team section header */}
            <div className={styles.teamHeader}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width={140} height={SKELETON_HEIGHTS.subheading} />
              <Skeleton variant="rounded" width={24} height={20} />
            </div>

            {/* Mission items */}
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.missionItem}>
                <Skeleton variant="circular" width={48} height={48} />
                <div className={styles.missionInfo}>
                  <Skeleton variant="text" width={`${80 - i * 10}%`} height={SKELETON_HEIGHTS.text} />
                  <Skeleton variant="text" width={`${50 + i * 5}%`} height={10} />
                </div>
                <Skeleton variant="rounded" width={70} height={22} />
              </div>
            ))}

            {/* Second team section */}
            <div className={styles.teamHeader}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width={100} height={SKELETON_HEIGHTS.subheading} />
              <Skeleton variant="rounded" width={24} height={20} />
            </div>

            {[4, 5].map((i) => (
              <div key={i} className={styles.missionItem}>
                <Skeleton variant="circular" width={48} height={48} />
                <div className={styles.missionInfo}>
                  <Skeleton variant="text" width={`${85 - i * 8}%`} height={SKELETON_HEIGHTS.text} />
                  <Skeleton variant="text" width={`${40 + i * 5}%`} height={10} />
                </div>
                <Skeleton variant="rounded" width={70} height={22} />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
