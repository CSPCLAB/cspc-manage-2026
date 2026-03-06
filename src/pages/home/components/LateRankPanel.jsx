import Panel from "../../../components/layout/Panel";
import styles from "./LateRankPanel.module.css";

function hexToRgba(hex, alpha = 0.18) {
  if (!hex) return "rgba(0,0,0,0.05)";

  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);

  if (Number.isNaN(n)) return "rgba(0,0,0,0.05)";

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

  const top3 = rankingList
    .filter((x) => (x?.late_count ?? 0) > 0)
    .sort((a, b) => (b?.late_count ?? 0) - (a?.late_count ?? 0))
    .slice(0, 3);

  if (top3.length === 0) {
    return (
      <Panel title="지각 TOP 3">
        <div className={styles.emptyMsg}>🎉 아직 지각자가 없어요!</div>
      </Panel>
    );
  }

  const rankedTop3 = [];
  let prevLateCount = null;
  let currentRank = 0;

  for (let i = 0; i < top3.length; i++) {
    const x = top3[i];

    if (x.late_count !== prevLateCount) {
      currentRank = i + 1;
    }

    rankedTop3.push({
      ...x,
      rank: currentRank,
    });

    prevLateCount = x.late_count;
  }

  return (
    <Panel title="지각 TOP 3">
      <ul className={styles.list}>
        {rankedTop3.map((x) => {
          const isTop1 = x.rank === 1;
          const color = x.color ?? "#94a3b8";

          return (
            <li
              key={x.name}
              className={`${styles.item} ${isTop1 ? styles.top1Item : ""}`}
              style={
                isTop1
                  ? {
                      borderColor: color,
                      background: hexToRgba(color, 0.22),
                    }
                  : undefined
              }
            >
              <div
                className={styles.rankCircle}
                style={
                  isTop1
                    ? {
                        backgroundColor: color,
                        color: "#fff",
                      }
                    : undefined
                }
              >
                {x.rank}
              </div>

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