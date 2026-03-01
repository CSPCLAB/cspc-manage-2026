import Panel from "../../../components/layout/Panel";
import styles from "./LateRankPanel.module.css";

function hexToRgba(hex, alpha = 0.12) {
  if (!hex) return `rgba(0,0,0,0.05)`;
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function LateRankPanel({
  rankingList = [],
  loadingRanking,
  rankingError,
}) {
  if (loadingRanking) {
    return <Panel title="지각 TOP 3">불러오는 중...</Panel>;
  }

  if (rankingError) {
    return <Panel title="지각 TOP 3">오류: {rankingError}</Panel>;
  }

  const top3 = rankingList.slice(0, 3);

  return (
    <Panel title="지각 TOP 3">
      <ul className={styles.list}>
        {top3.map((x, idx) => {
          const isTop1 = idx === 0;

          return (
            <li
              key={x.id}
              className={styles.item}
              style={
                isTop1
                  ? {
                      borderColor: x.color,
                      background: hexToRgba(x.color, 0.18),
                    }
                  : undefined
              }
            >
              <div className={styles.rankCircle}>{idx + 1}</div>
              <div className={styles.name}>
                {x.name}
                {isTop1 && <span className={styles.crown}> 👑</span>}
              </div>
              <div className={styles.late}>{x.late_count}회</div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}