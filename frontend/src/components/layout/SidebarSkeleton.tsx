import { Skeleton, SKELETON_HEIGHTS } from "@getbud-co/buds";
import styles from "./SidebarSkeleton.module.css";

export function SidebarSkeleton() {
  return (
    <div className={styles.sidebar}>
      <div className={styles.content} role="status" aria-label="Carregando">
        {/* Logo */}
        <div className={styles.logo}>
          <Skeleton variant="rounded" width={80} height={28} />
        </div>

        {/* Org switcher */}
        <div className={styles.orgSwitcher}>
          <Skeleton variant="rounded" width={32} height={32} />
          <Skeleton variant="text" width={120} height={SKELETON_HEIGHTS.text} />
        </div>

        <div className={styles.divider} />

        {/* Nav group 1 */}
        <div className={styles.navGroup}>
          <Skeleton variant="text" width={100} height={10} />
          <div className={styles.navItems}>
            {[90, 70, 110].map((w, i) => (
              <div key={i} className={styles.navItem}>
                <Skeleton variant="rounded" width={20} height={20} />
                <Skeleton variant="text" width={w} height={SKELETON_HEIGHTS.text} />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.divider} />

        {/* Nav group 2 */}
        <div className={styles.navGroup}>
          <Skeleton variant="text" width={80} height={10} />
          <div className={styles.navItems}>
            {[100, 80].map((w, i) => (
              <div key={i} className={styles.navItem}>
                <Skeleton variant="rounded" width={20} height={20} />
                <Skeleton variant="text" width={w} height={SKELETON_HEIGHTS.text} />
              </div>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className={styles.spacer} />

        {/* User footer */}
        <div className={styles.userFooter}>
          <Skeleton variant="circular" width={36} height={36} />
          <div className={styles.userInfo}>
            <Skeleton variant="text" width={100} height={SKELETON_HEIGHTS.text} />
            <Skeleton variant="text" width={60} height={10} />
          </div>
        </div>
      </div>
    </div>
  );
}
