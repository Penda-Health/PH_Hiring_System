import styles from "./spinner.module.css";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.ring} />
      {label && (
        <p className={styles.label}>
          {label}
          <span className={styles.ellipsisDot}>.</span>
          <span className={styles.ellipsisDot}>.</span>
          <span className={styles.ellipsisDot}>.</span>
        </p>
      )}
    </div>
  );
}
