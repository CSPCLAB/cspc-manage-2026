import { useEffect, useMemo, useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./AdminAuthPanel.module.css";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

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

  const todayIndex = useMemo(() => {
    const js = now.getDay();
    return (js + 6) % 7;
  }, [now]);

  const currentCell = useMemo(() => {
    const todayCells = cells.filter((c) => c.dayIndex === todayIndex);

    for (const cell of todayCells) {
      if (!cell?.startTime || !cell?.endTime) continue;

      const startAt = parseHHMMToDate(now, cell.startTime);
      let endAt = parseHHMMToDate(now, cell.endTime);

      if (!startAt) continue;
      if (!endAt || endAt <= startAt) {
        endAt = new Date(startAt.getTime() + 75 * 60 * 1000);
      }

      const endWindowAt = addMinutes(endAt, 10);

      if (now >= startAt && now <= endWindowAt) {
        return {
          ...cell,
          startAt,
          endAt,
        };
      }
    }

    return null;
  }, [cells, todayIndex, now]);

  const currentCellKey = useMemo(() => {
    if (!currentCell) return null;
    return keyOf(currentCell.dayIndex, currentCell.periodKey);
  }, [currentCell]);

  const currentAdmin = currentCell?.admin ?? null;
  const hasActiveAssignment = Boolean(currentCell && currentAdmin);

  useEffect(() => {
    setAttendanceId(null);
    setLateMarked(false);
    setActionMessage("");
  }, [week, currentCellKey]);

  const startEnabled = useMemo(() => {
    if (!currentCell || !currentAdmin || attendanceId) return false;

    const end = addMinutes(currentCell.startAt, 10);
    return inWindow(now, currentCell.startAt, end);
  }, [now, currentCell, currentAdmin, attendanceId]);

  const endEnabled = useMemo(() => {
    if (!currentCell || !currentAdmin || !attendanceId) return false;

    const s = addMinutes(currentCell.endAt, -10);
    const e = addMinutes(currentCell.endAt, 10);
    return inWindow(now, s, e);
  }, [now, currentCell, currentAdmin, attendanceId]);

  const isLate = useMemo(() => {
    if (!currentCell || !currentAdmin || attendanceId) return false;

    const lateTime = addMinutes(currentCell.startAt, 10);
    return now > lateTime && now <= currentCell.endAt;
  }, [now, currentCell, currentAdmin, attendanceId]);

  const endLate = useMemo(() => {
    if (!currentCell || !currentAdmin || !attendanceId) return false;

    const lateEnd = addMinutes(currentCell.endAt, 10);
    return now > lateEnd;
  }, [now, currentCell, currentAdmin, attendanceId]);

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
    hasActiveAssignment && currentCell
      ? `${DAYS[todayIndex]} ${currentCell.periodLabel || `${currentCell.periodKey}교시`}`
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
              <span className={styles.lateBadge}>지각</span>
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

        {hasActiveAssignment && currentCell && (
          <div className={styles.windows}>
            <div className={styles.winLine}>
              <span className={styles.winLabel}>시작</span>
              <span className={styles.winValue}>
                {toHHMM(currentCell.startAt)}~
                {toHHMM(addMinutes(currentCell.startAt, 10))}
              </span>
            </div>

            <div className={styles.winLine}>
              <span className={styles.winLabel}>끝</span>
              <span className={styles.winValue}>
                {toHHMM(addMinutes(currentCell.endAt, -10))}~
                {toHHMM(addMinutes(currentCell.endAt, 10))}
              </span>
            </div>
          </div>
        )}

        {loadingSchedule && <div className={styles.message}>시간표 불러오는 중...</div>}
        {scheduleError && <div className={styles.message}>{String(scheduleError)}</div>}
      </div>
    </Panel>
  );
}