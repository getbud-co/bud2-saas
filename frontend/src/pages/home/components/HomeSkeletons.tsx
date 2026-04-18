import { Card, CardHeader, CardBody, Skeleton, SKELETON_HEIGHTS } from "@getbud-co/buds";
import styles from "./HomeSkeletons.module.css";

export function HomePageSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando">
      {/* ——— PageHeader skeleton ——— */}
      <div className={styles.pageHeader}>
        <Skeleton variant="text" width={240} height={SKELETON_HEIGHTS.heading} />
        <Skeleton variant="rounded" width={70} height={24} />
      </div>

      {/* ——— BriefingCard skeleton (Accordion style) ——— */}
      <Card padding="sm">
        <CardBody>
          <div className={styles.briefing}>
            <Skeleton variant="rounded" width={20} height={20} />
            <div className={styles.briefingText}>
              <Skeleton variant="text" width={120} height={SKELETON_HEIGHTS.subheading} />
              <Skeleton variant="text" width={180} height={12} />
            </div>
            <Skeleton variant="rounded" width={60} height={24} />
          </div>
        </CardBody>
      </Card>

      {/* ——— Grid (2 columns) ——— */}
      <div className={styles.homeGrid}>
        {/* Left column */}
        <div className={styles.homeCol}>
          {/* MissionsCard (annual) */}
          <Card padding="sm">
            <CardHeader
              title=""
              action={<Skeleton variant="rounded" width={28} height={28} />}
            />
            <CardBody>
              <div className={styles.missions}>
                <Skeleton variant="text" width={160} height={SKELETON_HEIGHTS.text} />
                <Skeleton variant="rounded" width="100%" height={8} />
                <div className={styles.missionsFooter}>
                  <Skeleton variant="text" width={50} height={28} />
                  <Skeleton variant="text" width={100} height={SKELETON_HEIGHTS.text} />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* MissionsCard (quarterly) */}
          <Card padding="sm">
            <CardHeader
              title=""
              action={
                <div className={styles.cardActions}>
                  <Skeleton variant="rounded" width={120} height={28} />
                  <Skeleton variant="rounded" width={28} height={28} />
                </div>
              }
            />
            <CardBody>
              <div className={styles.missions}>
                <Skeleton variant="text" width={180} height={SKELETON_HEIGHTS.text} />
                <Skeleton variant="rounded" width="100%" height={8} />
                <div className={styles.missionsFooter}>
                  <Skeleton variant="text" width={50} height={28} />
                  <Skeleton variant="text" width={100} height={SKELETON_HEIGHTS.text} />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* EngagementCard */}
          <Card padding="sm">
            <CardHeader
              title=""
              action={
                <div className={styles.cardActions}>
                  <Skeleton variant="rounded" width={120} height={28} />
                  <Skeleton variant="rounded" width={28} height={28} />
                </div>
              }
            />
            <CardBody>
              <div className={styles.engagement}>
                <Skeleton variant="circular" width={120} height={120} />
                <div className={styles.engagementTrend}>
                  <Skeleton variant="rounded" width={20} height={20} />
                  <Skeleton variant="text" width={80} height={SKELETON_HEIGHTS.text} />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right column */}
        <div className={styles.homeCol}>
          {/* ActivitiesCard */}
          <Card padding="sm">
            <CardHeader
              title=""
              action={<Skeleton variant="rounded" width={28} height={28} />}
            />
            <CardBody>
              <div className={styles.activities}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={styles.activityItem}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <div className={styles.activityText}>
                      <Skeleton variant="text" width={`${85 - i * 8}%`} height={SKELETON_HEIGHTS.text} />
                      <Skeleton variant="text" width={`${55 + i * 5}%`} height={10} />
                    </div>
                    <Skeleton variant="text" width={14} height={14} />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* TeamHealthCard */}
          <Card padding="sm">
            <CardHeader
              title=""
              action={<Skeleton variant="rounded" width={28} height={28} />}
            />
            <CardBody>
              <div className={styles.teamHealth}>
                {/* Summary boxes */}
                <div className={styles.healthSummary}>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} padding="sm">
                      <CardBody>
                        <div className={styles.healthBox}>
                          <Skeleton variant="text" width={28} height={24} />
                          <Skeleton variant="text" width={40} height={10} />
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {/* Members list */}
                <div className={styles.healthMembers}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={styles.healthMember}>
                      <Skeleton variant="circular" width={36} height={36} />
                      <div className={styles.healthMemberInfo}>
                        <Skeleton variant="text" width={`${95 - i * 8}%`} height={SKELETON_HEIGHTS.text} />
                        <Skeleton variant="text" width={`${65 + i * 5}%`} height={10} />
                      </div>
                      <Skeleton variant="rounded" width={56} height={22} />
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
