import { useEffect, useMemo, useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./AdminAuthPanel.module.css";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const PERIODS = [
  { key: 1, label: "1교시", start: "09:00", end: "10:15" },
  { key: 2, label: "2교시", start: "10:30", end: "11:45" },
  { key: 3, label: "3교시", start: "12:00", end: "13:15" },
  { key: 4, label: "4교시", start: "13:30", end: "14:45" },
  { key: 5, label: "5교시", start: "15:00", end: "16:15" },
  { key: 6, label: "6교시", start: "16:30", end: "17:45" },
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

  const [hh, mm] = String(hhmm).slice(0, 5).split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hh,
    mm,
    0
  );
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

export default function AdminAuthPanel({
  adminPool = [],
  week,
  cells = [],
  loadingSchedule = false,
  scheduleError = null,
}) {
  const [now, setNow] = useState(() => new Date());
  const [attendanceId, setAttendanceId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [lateMarked, setLateMarked] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const cellMap = useMemo(() => {
    const m = new Map();
    cells.forEach((c) => {
      m.set(keyOf(c.dayIndex, c.periodKey), c);
    });
    return m;
  }, [cells]);

  const todayIndex = useMemo(() => {
    const js = now.getDay(); // 0=일..6=토
    return (js + 6) % 7; // 월=0..일=6
  }, [now]);

  const currentPeriod = useMemo(() => {
    for (const p of PERIODS) {
      const w = getPeriodWindow(now, p);
      if (!w) continue;
      if (now >= w.startAt && now <= w.endAt) {
        return { period: p, ...w };
      }
    }
    return null;
  }, [now]);

  const currentCellKey = useMemo(() => {
    if (!currentPeriod) return null;
    return keyOf(todayIndex, currentPeriod.period.key);
  }, [todayIndex, currentPeriod]);

  const currentCell = useMemo(() => {
    if (!currentCellKey) return null;
    return cellMap.get(currentCellKey) ?? null;
  }, [cellMap, currentCellKey]);

  const currentAdmin = currentCell?.admin ?? null;
  const hasActiveAssignment = Boolean(currentPeriod && currentAdmin);

  useEffect(() => {
    setAttendanceId(null);
    setLateMarked(false);
    setActionMessage("");
  }, [week, currentCellKey]);

  const startEnabled = useMemo(() => {
    if (!currentPeriod || !currentAdmin || attendanceId) return false;

    const end = addMinutes(currentPeriod.startAt, 10);
    return inWindow(now, currentPeriod.startAt, end);
  }, [now, currentPeriod, currentAdmin, attendanceId]);

  const endEnabled = useMemo(() => {
    if (!currentPeriod || !currentAdmin || !attendanceId) return false;

    const s = addMinutes(currentPeriod.endAt, -10);
    const e = addMinutes(currentPeriod.endAt, 10);
    return inWindow(now, s, e);
  }, [now, currentPeriod, currentAdmin, attendanceId]);

  const isLate = useMemo(() => {
    if (!currentPeriod || !currentAdmin || attendanceId) return false;

    const lateTime = addMinutes(currentPeriod.startAt, 10);
    return now > lateTime && now <= currentPeriod.endAt;
  }, [now, currentPeriod, currentAdmin, attendanceId]);

  const endLate = useMemo(() => {
    if (!currentPeriod || !currentAdmin || !attendanceId) return false;

    const lateEnd = addMinutes(currentPeriod.endAt, 10);
    return now > lateEnd;
  }, [now, currentPeriod, currentAdmin, attendanceId]);

  async function markLate() {
    if (!currentAdmin?.id || lateMarked) return;

    try {
      const sourceAdmin =
        adminPool.find((a) => String(a.id) === String(currentAdmin.id)) ?? currentAdmin;

      const newLate = (sourceAdmin.late_count ?? 0) + 1;

      const res = await fetch(`/api/users/${currentAdmin.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sourceAdmin.name,
          color_hex: sourceAdmin.color,
          late_count: newLate,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "지각 처리에 실패했어요.");
      }

      setLateMarked(true);
      setActionMessage("지각 처리되었습니다.");
    } catch (err) {
      console.error("지각 처리 실패", err);
      setActionMessage(err?.message || "지각 처리 중 오류가 발생했어요.");
    }
  }

  useEffect(() => {
    if (isLate && !attendanceId && !lateMarked) {
      markLate();
    }
  }, [isLate, attendanceId, lateMarked]);

  useEffect(() => {
    if (endLate && attendanceId && !lateMarked) {
      markLate();
    }
  }, [endLate, attendanceId, lateMarked]);

  async function handleStart() {
    if (!currentCell?.weeklyId || !currentAdmin?.id || !startEnabled || starting) return;

    try {
      setStarting(true);
      setActionMessage("");

      const res = await fetch(`/api/attendance/${currentCell.weeklyId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin_id: currentAdmin.id,
          is_late: false,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "관리 시작 처리에 실패했어요.");
      }

      setAttendanceId(payload.data?.attendance_id ?? null);
      setActionMessage("관리 시작이 기록되었어요.");
    } catch (e) {
      setActionMessage(e?.message || "관리 시작 중 오류가 발생했어요.");
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd() {
    if (!attendanceId || !endEnabled || ending) return;

    try {
      setEnding(true);
      setActionMessage("");

      const res = await fetch(`/api/attendance/${attendanceId}/end`, {
        method: "PATCH",
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "관리 종료 처리에 실패했어요.");
      }

      setActionMessage("관리 종료가 기록되었어요.");
      setAttendanceId(null);
    } catch (e) {
      setActionMessage(e?.message || "관리 종료 중 오류가 발생했어요.");
    } finally {
      setEnding(false);
    }
  }

  const periodText =
    hasActiveAssignment && currentPeriod
      ? `${DAYS[todayIndex]} ${currentPeriod.period.label}`
      : "관리 시간 아님";

  return (
    <Panel title="관리 인증" className={styles.panel}>
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.topLine}>
            <span className={styles.timeNow}>지금 {toHHMM(now)}</span>
            <span className={styles.sep}>·</span>
            <span className={hasActiveAssignment ? styles.periodOn : styles.periodOff}>
              {periodText}
            </span>
            {hasActiveAssignment && isLate && (
              <span className={styles.lateText}>지각</span>
            )}
          </div>
        </div>

        <div className={styles.assignee}>
          <span
            className={styles.dot}
            style={{ backgroundColor: currentAdmin?.color ?? "rgba(0,0,0,0.18)" }}
          />
          <div className={styles.assigneeText}>
            <div className={styles.assigneeLabel}>현재 담당자</div>
            <div className={styles.assigneeName}>{currentAdmin?.name ?? "—"}</div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${startEnabled ? styles.btnOn : styles.btnOff}`}
            disabled={!startEnabled || starting || !!attendanceId}
            onClick={handleStart}
          >
            {starting ? "시작 처리중" : attendanceId ? "시작 완료" : "시작"}
            <span
              className={`${styles.pill} ${
                attendanceId || startEnabled ? styles.pillOn : styles.pillOff
              }`}
            >
              {starting ? "처리중" : attendanceId ? "완료" : startEnabled ? "활성" : "비활성"}
            </span>
          </button>

          <button
            className={`${styles.btn} ${endEnabled ? styles.btnOn : styles.btnOff}`}
            disabled={!endEnabled || ending}
            onClick={handleEnd}
          >
            {ending ? "종료 처리중" : "끝"}
            <span className={`${styles.pill} ${endEnabled ? styles.pillOn : styles.pillOff}`}>
              {ending ? "처리중" : endEnabled ? "활성" : "비활성"}
            </span>
          </button>
        </div>

        {hasActiveAssignment && currentPeriod && (
          <div className={styles.windows}>
            <div className={styles.winLine}>
              <span className={styles.winLabel}>시작</span>
              <span className={styles.winValue}>
                {toHHMM(currentPeriod.startAt)}~
                {toHHMM(addMinutes(currentPeriod.startAt, 10))}
              </span>
            </div>

            <div className={styles.winLine}>
              <span className={styles.winLabel}>끝</span>
              <span className={styles.winValue}>
                {toHHMM(addMinutes(currentPeriod.endAt, -10))}~
                {toHHMM(addMinutes(currentPeriod.endAt, 10))}
              </span>
            </div>
          </div>
        )}

        {loadingSchedule && <div className={styles.message}>시간표 불러오는 중...</div>}
        {scheduleError && <div className={styles.message}>{String(scheduleError)}</div>}
        {actionMessage && <div className={styles.message}>{actionMessage}</div>}
      </div>
    </Panel>
  );
}