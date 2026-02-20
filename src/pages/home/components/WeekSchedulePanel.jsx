import { useEffect, useMemo, useState } from "react";
import Panel from "../../../components/layout/Panel";
import WeekPager from "./WeekPager";
import styles from "./WeekSchedulePanel.module.css";

const DAYS = ["월", "화", "수", "목", "금"];
const PERIODS = [
  { key: 1, label: "1교시", start: "09:00", end: "10:15" },
  { key: 2, label: "2교시", start: "10:30", end: "11:45" },
  { key: 3, label: "3교시", start: "12:00", end: "12:00" },
  { key: 4, label: "4교시", start: "13:30", end: "14:45" },
  { key: 5, label: "5교시", start: "15:00", end: "16:15" },
  { key: 6, label: "6교시", start: "16:30", end: "17:45" },
  { key: 7, label: "저녁", start: "18:00", end: "" },
];

function hexToRgba(hex, alpha = 0.12) {
  if (!hex) return `rgba(0,0,0,0.03)`;
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeDummyWeek(weekNumber) {
  const admins = [
    { name: "다솔", color: "#60a5fa" },
    { name: "준일", color: "#34d399" },
    { name: "예원", color: "#fbbf24" },
  ];

  const items = [];
  for (let d = 0; d < DAYS.length; d++) {
    for (let p = 0; p < PERIODS.length; p++) {
      const pick = admins[(d + p + weekNumber) % admins.length];
      items.push({
        dayIndex: d,
        periodKey: PERIODS[p].key,
        admin: pick,
        isSub: (d + p + weekNumber) % 7 === 0,
      });
    }
  }
  return items;
}

function keyOf(dayIndex, periodKey) {
  return `${dayIndex}-${periodKey}`;
}

export default function WeekSchedulePanel() {
  const [week, setWeek] = useState(1);

  // ✅ 편집 모드
  const [isEdit, setIsEdit] = useState(false);

  // ✅ “집은 칸”
  const [picked, setPicked] = useState(null); // { dayIndex, periodKey } | null

  // ✅ 주차별 시간표 상태(여기가 실제로 수정되는 데이터)
  const [cells, setCells] = useState(() => makeDummyWeek(week));

  // 주차 바뀌면 해당 주차 데이터 로드(지금은 더미)
  useEffect(() => {
    setCells(makeDummyWeek(week));
    setPicked(null);
  }, [week]);

  // Esc로 선택 취소
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 빠른 조회 맵
  const map = useMemo(() => {
    const m = new Map();
    cells.forEach((c) => m.set(keyOf(c.dayIndex, c.periodKey), c));
    return m;
  }, [cells]);

  const onClickCell = (dayIndex, periodKey) => {
    if (!isEdit) return;

    // 1) 아직 집은 칸 없음 → 이 칸을 집기
    if (!picked) {
      setPicked({ dayIndex, periodKey });
      return;
    }

    // 2) 같은 칸 다시 클릭 → 선택 취소
    if (picked.dayIndex === dayIndex && picked.periodKey === periodKey) {
      setPicked(null);
      return;
    }

    // 3) 다른 칸 클릭 → 스왑(교체)
    const fromKey = keyOf(picked.dayIndex, picked.periodKey);
    const toKey = keyOf(dayIndex, periodKey);

    const fromCell = map.get(fromKey);
    const toCell = map.get(toKey);

    if (!fromCell || !toCell) {
      setPicked(null);
      return;
    }

    setCells((prev) => {
      // prev에서 두 칸만 교체한 새 배열 만들기
      return prev.map((c) => {
        const k = keyOf(c.dayIndex, c.periodKey);
        if (k === fromKey) {
          return {
            ...c,
            admin: toCell.admin,
            isSub: true, // ✅ 대타 발생이면 true로 (정책은 너희가 정하면 됨)
          };
        }
        if (k === toKey) {
          return {
            ...c,
            admin: fromCell.admin,
            isSub: true,
          };
        }
        return c;
      });
    });

    setPicked(null);

    // TODO: 여기서 백엔드에 저장 요청
    // await api.patch(`/weekly-schedules/swap`, { week, from:{...picked}, to:{dayIndex, periodKey} })
  };

  return (
    <Panel
      title="주차별 시간표"
      right={
        <div className={styles.rightControls}>
          <WeekPager week={week} onChangeWeek={setWeek} />
          <button
            className={`${styles.editBtn} ${isEdit ? styles.editOn : ""}`}
            onClick={() => {
              setIsEdit((v) => !v);
              setPicked(null);
            }}
            title="시간표 수정"
          >
            ✏️
          </button>
        </div>
      }
      className={styles.panelFull}
      bodyClassName={styles.noScrollBody}
    >
      {/* 편집 모드 안내 */}
      {isEdit && (
        <div className={styles.editHint}>
          바꿀 칸을 먼저 클릭한 뒤, 옮길 칸을 클릭하면 교체돼요. (Esc: 취소)
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.corner} />

        {DAYS.map((d) => (
          <div key={d} className={styles.dayHeader}>
            {d}
          </div>
        ))}

        {PERIODS.map((p) => (
          <div key={`row-${p.key}`} className={styles.row}>
            <div className={styles.periodHeader}>
              <div className={styles.periodLabel}>{p.label}</div>
              <div className={styles.periodTime}>
                {p.start} ~ {p.end}
              </div>
            </div>

            {DAYS.map((_, dayIndex) => {
              const cell = map.get(keyOf(dayIndex, p.key));
              const isPicked =
                picked?.dayIndex === dayIndex && picked?.periodKey === p.key;

              return (
                <div
                  key={`${dayIndex}-${p.key}`}
                  className={[
                    styles.cell,
                    isEdit ? styles.editable : "",
                    isPicked ? styles.picked : "",
                    cell?.isSub ? styles.substitute : "",
                  ].join(" ")}
                  style={{
                    backgroundColor: hexToRgba(cell?.admin.color, 0.12),
                  }}
                  onClick={() => onClickCell(dayIndex, p.key)}
                  role={isEdit ? "button" : undefined}
                >
                  <div className={styles.adminRow}>
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: cell?.admin.color }}
                    />
                    <span className={styles.adminName}>{cell?.admin.name}</span>
                    {cell?.isSub && <span className={styles.subBadge}>대타</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Panel>
  );
}