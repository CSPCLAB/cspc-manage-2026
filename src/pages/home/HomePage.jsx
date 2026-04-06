import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HomePage.module.css";
import TopBar from "../../components/layout/TopBar";
import WeekSchedulePanel from "./components/WeekSchedulePanel";
import NoticePanel from "./components/NoticePanel";
import MeetingPanel from "./components/MeetingPanel";
import RequestsPanel from "./components/RequestsPanel";
import AdminAuthPanel from "./components/AdminAuthPanel";
import LateRankPanel from "./components/LateRankPanel";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const PERIODS = [
  { key: 1, label: "1교시", start: "09:00", end: "10:15" },
  { key: 2, label: "2교시", start: "10:30", end: "11:45" },
  { key: 3, label: "3교시", start: "12:00", end: "13:15" },
  { key: 4, label: "4교시", start: "13:30", end: "14:45" },
  { key: 5, label: "5교시", start: "15:00", end: "16:15" },
  { key: 6, label: "6교시", start: "16:30", end: "17:45" },
];

const DAY_TO_INDEX = {
  월: 0,
  화: 1,
  수: 2,
  목: 3,
  금: 4,
  토: 5,
  일: 6,
};

function dayIndexFromKoreanDay(dayOfWeek) {
  if (!dayOfWeek) return null;
  // "월요일" -> "월"
  const key = String(dayOfWeek).trim().charAt(0);
  return DAY_TO_INDEX[key] ?? null;
}

function keyOf(dayIndex, periodKey) {
  return `${dayIndex}-${periodKey}`;
}

function normalizeHexColor(s) {
  const v = (s ?? "").toString().trim();
  if (!v) return null;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
}

function normalizeDateString(dateString) {
  if (!dateString) return null;
  const value = String(dateString).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function buildFilledCells(schedules, adminPool) {
  const nextCells = (schedules ?? [])
    .map((s) => {
      const slot = s?.Timetable_Slots;
      const dayIndex = dayIndexFromKoreanDay(slot?.day_of_week);
      const periodKey = Number(slot?.period_number);

      if (dayIndex == null || !Number.isFinite(periodKey)) return null;

      const weeklyId = s?.id ?? null;
      const slotId = slot?.id ?? null;
      const attendanceRow = Array.isArray(s?.Shift_Attendance) ? s.Shift_Attendance[0] ?? null : null;

      const assignedId = s?.assigned_admin_id != null ? s.assigned_admin_id : null;
      const defaultId = slot?.default_admin_id != null ? slot.default_admin_id : null;
      const isSub = Boolean(s?.is_substitute);

      const fromPool = (adminId) =>
        adminId != null ? adminPool.find((a) => a.id === adminId) : null;

      const assignedUser = fromPool(assignedId);
      const defaultUser = fromPool(defaultId);

      const admin =
        assignedUser == null
          ? null
          : {
              id: assignedUser.id,
              name: assignedUser.name,
              color: assignedUser.color_hex ?? assignedUser.color,
              late_count: assignedUser.late_count ?? 0,
            };

      const defaultAdmin =
        defaultUser == null
          ? null
          : {
              id: defaultUser.id,
              name: defaultUser.name,
              color: defaultUser.color_hex ?? defaultUser.color,
            };

      return {
        weeklyId,
        slotId,
        dayIndex,
        periodKey,
        startTime: slot?.start_time ?? null,
        endTime: slot?.end_time ?? null,
        periodLabel: Number.isFinite(periodKey) ? `${periodKey}교시` : "",
        admin,
        defaultAdmin,
        assignedAdminId: assignedId,
        defaultAdminId: defaultId,
        isSub,
        attendance: attendanceRow
          ? {
              id: attendanceRow.id ?? null,
              adminId: attendanceRow.admin_id ?? null,
              checkInAt: attendanceRow.check_in_at ?? null,
              checkOutAt: attendanceRow.check_out_at ?? null,
              isLate: Boolean(attendanceRow.is_late),
            }
          : null,
      };
    })
    .filter(Boolean);

  const filled = [];
  const mapFromApi = new Map(nextCells.map((c) => [keyOf(c.dayIndex, c.periodKey), c]));

  for (let d = 0; d < DAYS.length; d++) {
    for (let p = 0; p < PERIODS.length; p++) {
      const k = keyOf(d, PERIODS[p].key);
      filled.push(
        mapFromApi.get(k) ?? {
          weeklyId: null,
          slotId: null,
          dayIndex: d,
          periodKey: PERIODS[p].key,
          startTime: null,
          endTime: null,
          periodLabel: `${PERIODS[p].key}교시`,
          admin: null,
          defaultAdmin: null,
          assignedAdminId: null,
          defaultAdminId: null,
          isSub: false,
          attendance: null,
        }
      );
    }
  }

  return filled;
}

export default function HomePage() {
  const NOTION_URL = "https://www.notion.so/cspclab/CSPC-LAB-40d34473aee644978b4bef89c6db55c2";

  const navigate = useNavigate();
  const outerRef = useRef(null);

  // ✅ 이 값이 핵심: 지금 화면에서 여백이 많이 남으니 기준 폭을 조금 키움
  const BASE_W = 1700;

  // ✅ 너무 좁아지면 1열 스택으로 전환할 기준
  const STACK_BREAKPOINT = 1250;

  useEffect(() => {
    const applyScale = () => {
      const vw = window.innerWidth;
      const shouldStack = vw <= STACK_BREAKPOINT;

      if (shouldStack) {
        outerRef.current?.style.setProperty("--use-scale", "0");
        return;
      }

      const pad = 16 * 2;                // pageOuter padding 기준
      const availW = vw - pad;

      const s = Math.min(availW / BASE_W, 1);  // ✅ 가로 기준 스케일

      const el = outerRef.current;
      if (!el) return;

      el.style.setProperty("--use-scale", "1");
      el.style.setProperty("--app-scale", String(s));
      el.style.setProperty("--app-base-w", `${BASE_W}px`);
    };

    applyScale();
    window.addEventListener("resize", applyScale);
    return () => window.removeEventListener("resize", applyScale);
  }, []);

  const [adminPool, setAdminPool] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminError, setAdminError] = useState(null);

  const [rankingList, setRankingList] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [rankingError, setRankingError] = useState(null);

  const [week, setWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(1);
  const [scheduleCache, setScheduleCache] = useState({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [didInitScheduleWeek, setDidInitScheduleWeek] = useState(false);

  useEffect(() => {
    async function fetchAdmins() {
      try {
        setLoadingAdmins(true);
        setAdminError(null);

        const res = await fetch("/api/users");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json.success) throw new Error(json.message || "학회원 불러오기 실패");

        const cleaned = (json.data ?? []).map((u) => ({
          id: u.id,
          name: u.name,
          color: normalizeHexColor(u.color_hex) ?? "#94a3b8",
          late_count: u.late_count ?? 0,
        }));

        setAdminPool(cleaned);
      } catch (err) {
        setAdminError(err?.message || String(err));
      } finally {
        setLoadingAdmins(false);
      }
    }

    fetchAdmins();
  }, []);

  useEffect(() => {
    async function fetchRanking() {
      try {
        setLoadingRanking(true);
        setRankingError(null);

        const res = await fetch("/api/users/ranking");
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.message || "랭킹 불러오기 실패");
        }

        const cleaned = (json.data ?? []).map((u) => ({
          name: u.name,
          color: normalizeHexColor(u.color_hex) ?? "#94a3b8",
          late_count: u.late_count ?? 0,
        }));

        setRankingList(cleaned);
      } catch (err) {
        setRankingError(err?.message || String(err));
      } finally {
        setLoadingRanking(false);
      }
    }

    fetchRanking();
  }, []);

  const fetchWeekSchedule = useCallback(async (targetWeek, pool) => {
    const res = await fetch(`/api/schedules/${targetWeek}`);
    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.success) {
      throw new Error(payload?.message || `${targetWeek}주차 시간표 불러오기 실패`);
    }

    const data = payload?.data ?? {};
    const schedules = data?.schedules ?? [];

    return {
      weekNumber: Number(data?.week_number) || targetWeek,
      startDate: normalizeDateString(data?.start_date),
      endDate: normalizeDateString(data?.end_date),
      cells: buildFilledCells(schedules, pool),
    };
  }, []);

  const fetchScheduleMeta = useCallback(async () => {
    const res = await fetch("/api/schedules/meta");
    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.success) {
      throw new Error(payload?.message || "주차 메타 정보 불러오기 실패");
    }

    const weeks = Array.isArray(payload?.weeks)
      ? payload.weeks
          .map((item) => ({
            weekNumber: Number(item?.week_number),
            startDate: normalizeDateString(item?.start_date),
            endDate: normalizeDateString(item?.end_date),
          }))
          .filter((item) => Number.isFinite(item.weekNumber))
      : [];

    const parsedTotalWeeks = Number(payload?.totalWeeks);
    const nextTotalWeeks =
      Number.isFinite(parsedTotalWeeks) && parsedTotalWeeks > 0
        ? parsedTotalWeeks
        : weeks.length > 0
        ? Math.max(...weeks.map((item) => item.weekNumber))
        : 1;

    return {
      totalWeeks: nextTotalWeeks,
      weeks,
    };
  }, []);

  useEffect(() => {
    if (!adminPool.length) return;

    let alive = true;

    const fetchSchedules = async () => {
      setLoadingSchedule(true);
      setScheduleError(null);

      try {
        const [meta, todaySchedule] = await Promise.all([
          fetchScheduleMeta(),
          fetchWeekSchedule("today", adminPool),
        ]);

        if (!alive) return;

        setTotalWeeks(meta.totalWeeks);

        const validWeekNumbers = meta.weeks.length
          ? meta.weeks.map((item) => item.weekNumber)
          : Array.from({ length: meta.totalWeeks }, (_, index) => index + 1);

        const metaByWeek = new Map(meta.weeks.map((item) => [item.weekNumber, item]));
        const todayWeekNumber = todaySchedule.weekNumber;

        const initialCache = {};

        validWeekNumbers.forEach((weekNumber) => {
          const metaItem = metaByWeek.get(weekNumber);
          initialCache[weekNumber] = {
            weekNumber,
            startDate: metaItem?.startDate ?? null,
            endDate: metaItem?.endDate ?? null,
            cells: [],
          };
        });

        initialCache[todayWeekNumber] = {
          ...initialCache[todayWeekNumber],
          ...todaySchedule,
        };

        setScheduleCache(initialCache);
        setWeek(todayWeekNumber);
        setDidInitScheduleWeek(true);

        const remainingWeeks = validWeekNumbers.filter((weekNumber) => weekNumber !== todayWeekNumber);

        Promise.all(
          remainingWeeks.map((weekNumber) => fetchWeekSchedule(weekNumber, adminPool))
        )
          .then((results) => {
            if (!alive) return;

            setScheduleCache((prev) => ({
              ...prev,
              ...Object.fromEntries(results.map((item) => [item.weekNumber, item])),
            }));
          })
          .catch(() => {
          });
      } catch (e) {
        if (!alive) return;
        setScheduleError(e?.message || "시간표 불러오기 오류");
      } finally {
        if (alive) {
          setLoadingSchedule(false);
        }
      }
    };

    fetchSchedules();

    return () => {
      alive = false;
    };
  }, [adminPool, didInitScheduleWeek, fetchScheduleMeta, fetchWeekSchedule]);

  useEffect(() => {
    if (!adminPool.length) return undefined;

    const timer = setInterval(() => {
      fetchWeekSchedule(week, adminPool)
        .then((scheduleData) => {
          setScheduleCache((prev) => ({
            ...prev,
            [week]: scheduleData,
          }));
        })
        .catch(() => {
        });
    }, 30000);

    return () => clearInterval(timer);
  }, [adminPool, week, fetchWeekSchedule]);

  const currentWeekSchedule = scheduleCache[week] ?? null;
  const currentWeekCells = currentWeekSchedule?.cells ?? [];

  return (
    <div ref={outerRef} className={styles.pageOuter}>
      <div className={styles.page}>
        <TopBar
          right={
            <div className={styles.topRightButtons}>
              {/* 버튼 제거
              <button className={styles.notionBtn} onClick={() => navigate("./admin")}>
                관리자 페이지
              </button>
              */}
              <button className={styles.notionBtn} onClick={() => navigate("./d104")}>
                실습실 관리
              </button>
              <button
                className={styles.notionBtn}
                onClick={() => window.open(NOTION_URL, "_blank", "noopener,noreferrer")}
              >
                노션 바로가기
              </button>
            </div>
          }
        />

        <div className={styles.grid}>
          <div className={styles.left}>
            <div className={styles.leftTop}>
              <NoticePanel />
              <AdminAuthPanel
                week={week}
                cells={currentWeekCells}
                loadingSchedule={loadingSchedule}
                scheduleError={scheduleError}
              />
            </div>
            <div className={styles.leftBottom}>
              <WeekSchedulePanel
                adminPool={adminPool}
                loadingAdmins={loadingAdmins}
                adminError={adminError}
                week={week}
                onChangeWeek={setWeek}
                totalWeeks={totalWeeks}
                startDate={currentWeekSchedule?.startDate ?? null}
                endDate={currentWeekSchedule?.endDate ?? null}
                cells={currentWeekCells}
                setCellsForWeek={(nextCells) =>
                  setScheduleCache((prev) => ({
                    ...prev,
                    [week]: {
                      ...prev[week],
                      weekNumber: prev[week]?.weekNumber ?? week,
                      startDate: prev[week]?.startDate ?? null,
                      endDate: prev[week]?.endDate ?? null,
                      cells: nextCells,
                    },
                  }))
                }
                loadingSchedule={loadingSchedule}
                scheduleError={scheduleError}
              />
            </div>
          </div>

          <div className={styles.right}>
            <MeetingPanel />
            <RequestsPanel />
            <LateRankPanel
              rankingList={rankingList}
              loadingRanking={loadingRanking}
              rankingError={rankingError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
