import styles from "./Panel.module.css";

export default function Panel({ title, right, children, className, bodyClassName }) {
  return (
    <section className={`${styles.panel} ${className ?? ""}`}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {right ? <div className={styles.right}>{right}</div> : null}
      </header>
      <div className={`${styles.body} ${bodyClassName ?? ""}`}>{children}</div>
    </section>
  );
}

