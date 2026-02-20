import styles from "./TopBar.module.css";

function formatKoreanDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const w = weekdays[date.getDay()];
  return `${y}.${m}.${d} (${w})`;
}

export default function TopBar({ title = "CSPC 관리 페이지", right }) {
  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          <span className={styles.date}>{formatKoreanDate()}</span>
        </div>
      </div>

      <div className={styles.right}>{right}</div>
    </div>
  );
}
