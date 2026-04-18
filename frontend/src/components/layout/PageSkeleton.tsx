import { Card, CardBody, Skeleton, SKELETON_HEIGHTS } from "@getbud-co/buds";
import styles from "./PageSkeleton.module.css";

export function PageSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando">
      <div className={styles.header}>
        <Skeleton variant="text" width={220} height={SKELETON_HEIGHTS.heading} />
        <div className={styles.headerActions}>
          <Skeleton variant="rounded" width={100} height={SKELETON_HEIGHTS.button} />
        </div>
      </div>

      <div className={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding="sm">
            <CardBody>
              <div className={styles.cardContent}>
                <Skeleton variant="text" width={`${50 + i * 5}%`} height={SKELETON_HEIGHTS.subheading} />
                <Skeleton variant="text" width="100%" height={SKELETON_HEIGHTS.text} />
                <Skeleton variant="text" width="80%" height={SKELETON_HEIGHTS.text} />
                <Skeleton variant="rounded" width="100%" height={100} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
