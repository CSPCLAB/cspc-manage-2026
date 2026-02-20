import styles from "./WeekPager.module.css";

export default function WeekPager({ week, onChangeWeek }) {
  const clamp = (n) => Math.max(1, Math.min(16, n));

  return (
    <div className={styles.wrap}>
      <button className={styles.btn} onClick={() => onChangeWeek(clamp(week - 1))}>
        ◀
      </button>

      <div className={styles.label}>{week}주차</div>

      <button className={styles.btn} onClick={() => onChangeWeek(clamp(week + 1))}>
        ▶
      </button>

      <select
        className={styles.select}
        value={week}
        onChange={(e) => onChangeWeek(Number(e.target.value))}
      >
        {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}주차
          </option>
        ))}
      </select>
    </div>
  );
}
