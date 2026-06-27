import styles from "./spinner.module.css";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/favicon.svg" alt="" className={styles.coin} />
      </div>
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
