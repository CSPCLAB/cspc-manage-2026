import { useEffect, useMemo, useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./AdminAuthPanel.module.css";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const PERIODS = [
  { key: 1, label: "1교시", start: "09:00", end: "10:15" },
  { key: 2, label: "2교시", start: "10:30", end: "11:45" },
  { key: 3, label: "3교시", start: "12:00", end: "12:00" },
  { key: 4, label: "4교시", start: "13:30", end: "14:45" },
  { key: 5, label: "5교시", start: "15:00", end: "16:15" },
  { key: 6, label: "6교시", start: "16:30", end: "17:45" },
  { key: 7, label: "저녁", start: "18:00", end: "" },
];

const ADMIN_POOL = [
  { id: "a1", name: "다솔", color: "#60a5fa" },
  { id: "a2", name: "준일", color: "#34d399" },
  { id: "a3", name: "예원", color: "#fbbf24" },
];

function keyOf(dayIndex, periodKey) {
  return `${dayIndex}-${periodKey}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toHHMM(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseHHMMToDate(baseDate, hhmm) {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hh, mm, 0);
}

function getPeriodWindow(baseDate, period) {
  const s = parseHHMMToDate(baseDate, period.start);
  let e = parseHHMMToDate(baseDate, period.end);
  if (!s) return null;

  if (!e) e = new Date(s.getTime() + 120 * 60 * 1000);
  if (e <= s) e = new Date(s.getTime() + 75 * 60 * 1000);
  return { startAt: s, endAt: e };
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60 * 1000);
}

function inWindow(now, start, end) {
  return now >= start && now <= end;
}

function makeDummyWeek(weekNumber) {
  const items = [];
  for (let d = 0; d < DAYS.length; d++) {
    for (let p = 0; p < PERIODS.length; p++) {
      const pick = ADMIN_POOL[(d + p + weekNumber) % ADMIN_POOL.length];
      items.push({
        dayIndex: d,
        periodKey: PERIODS[p].key,
        admin: pick,
      });
    }
  }
  return items;
}

export default function AdminAuthPanel() {
  const [week] = useState(1); // 디자인 단계라 고정. (원하면 HomePage에서 week prop으로 받게 바꿔줄게)

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const map = useMemo(() => {
    const cells = makeDummyWeek(week);
    const m = new Map();
    cells.forEach((c) => m.set(keyOf(c.dayIndex, c.periodKey), c));
    return m;
  }, [week]);

  const todayIndex = useMemo(() => {
    const js = now.getDay(); // 0=일..6=토
    return (js + 6) % 7; // 월=0..일=6
  }, [now]);

  const currentPeriod = useMemo(() => {
    for (const p of PERIODS) {
      const w = getPeriodWindow(now, p);
      if (!w) continue;
      if (now >= w.startAt && now <= w.endAt) return { period: p, ...w };
    }
    return null;
  }, [now]);

  const currentCellKey = useMemo(() => {
    if (!currentPeriod) return null;
    return keyOf(todayIndex, currentPeriod.period.key);
  }, [todayIndex, currentPeriod]);

  const currentAdmin = currentCellKey ? map.get(currentCellKey)?.admin ?? null : null;

  const startEnabled = useMemo(() => {
    if (!currentPeriod) return false;
    const end = addMinutes(currentPeriod.startAt, 10);
    return inWindow(now, currentPeriod.startAt, end);
  }, [now, currentPeriod]);

  const endEnabled = useMemo(() => {
    if (!currentPeriod) return false;
    const s = addMinutes(currentPeriod.endAt, -10);
    const e = addMinutes(currentPeriod.endAt, 10);
    return inWindow(now, s, e);
  }, [now, currentPeriod]);

  return (
    <Panel title="관리 인증" className={styles.panel}>
      <div className={styles.wrap}>
        <div className={styles.topRow}>
            <div className={styles.topLine}>
                <span className={styles.timeNow}>지금 {toHHMM(now)}</span>
                <span className={styles.sep}>·</span>
                <span className={currentPeriod ? styles.periodOn : styles.periodOff}>
                {currentPeriod ? `${DAYS[todayIndex]} ${currentPeriod.period.label}` : "관리 시간 아님"}
                </span>
            </div>
            </div>

        <div className={styles.assignee}>
          <span className={styles.dot} style={{ backgroundColor: currentAdmin?.color ?? "rgba(0,0,0,0.18)" }} />
          <div className={styles.assigneeText}>
            <div className={styles.assigneeLabel}>현재 담당자</div>
            <div className={styles.assigneeName}>{currentAdmin?.name ?? "—"}</div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${startEnabled ? styles.btnOn : styles.btnOff}`}
            disabled={!startEnabled}
            onClick={() => console.log("[ADMIN_START]", { at: now.toISOString(), cellKey: currentCellKey })}
          >
            시작
            <span className={`${styles.pill} ${startEnabled ? styles.pillOn : styles.pillOff}`}>{startEnabled ? "활성" : "비활성"}</span>
          </button>

          <button
            className={`${styles.btn} ${endEnabled ? styles.btnOn : styles.btnOff}`}
            disabled={!endEnabled}
            onClick={() => console.log("[ADMIN_END]", { at: now.toISOString(), cellKey: currentCellKey })}
          >
            끝
            <span className={`${styles.pill} ${endEnabled ? styles.pillOn : styles.pillOff}`}>{endEnabled ? "활성" : "비활성"}</span>
          </button>
        </div>

        {currentPeriod && (
          <div className={styles.windows}>
            <div className={styles.winLine}>
              <span className={styles.winLabel}>시작</span>
              <span className={styles.winValue}>
                {toHHMM(currentPeriod.startAt)}~{toHHMM(addMinutes(currentPeriod.startAt, 10))}
              </span>
            </div>
            <div className={styles.winLine}>
              <span className={styles.winLabel}>끝</span>
              <span className={styles.winValue}>
                {toHHMM(addMinutes(currentPeriod.endAt, -10))}~{toHHMM(addMinutes(currentPeriod.endAt, 10))}
              </span>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}