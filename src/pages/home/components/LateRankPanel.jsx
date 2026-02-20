import Panel from "../../../components/layout/Panel";
import styles from "./LateRankPanel.module.css";

const DUMMY = [
  { name: "준일", late: 4 },
  { name: "예원", late: 3 },
  { name: "다솔", late: 2 },
];

export default function LateRankPanel() {
  return (
    <Panel title="지각 TOP 3" bodyClassName={styles.bodyNoScroll}>
      <ul className={styles.list}>
        {DUMMY.map((x, idx) => (
          <li
            key={x.name}
            className={`${styles.item} ${
              idx === 0 ? styles.top1 : ""
            }`}
          >
            <div className={styles.rankCircle}>
              {idx + 1}
            </div>

            <div className={styles.name}>
              {x.name}
              {idx === 0 && (
                <span className={styles.crown}> 👑</span>
              )}
            </div>

            <div className={styles.late}>
              {x.late}회
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
