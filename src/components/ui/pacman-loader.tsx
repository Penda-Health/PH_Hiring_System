import styles from "./pacman-loader.module.css";

export function PacmanLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className={styles.wrap}>
      <div className="relative h-8 w-36">
        <div className={styles.pacman} />
        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
      <p className={styles.label}>
        {label}
        <span className={styles.ellipsisDot}>.</span>
        <span className={styles.ellipsisDot}>.</span>
        <span className={styles.ellipsisDot}>.</span>
      </p>
    </div>
  );
}
