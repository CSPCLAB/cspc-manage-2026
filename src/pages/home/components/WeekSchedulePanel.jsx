import { useEffect, useMemo, useRef, useState } from "react";
import Panel from "../../../components/layout/Panel";
import WeekPager from "./WeekPager";
import styles from "./WeekSchedulePanel.module.css";

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

  if (!e) e = new Date(s.getTime() + 120 * 60 * 1000); // end 없으면 2시간
  if (e <= s) e = new Date(s.getTime() + 75 * 60 * 1000); // 이상치 보호

  return { startAt: s, endAt: e };
}

// 시간표의 한 칸을 고유하게 식별하는 ID를 만드는 함수
function keyOf(dayIndex, periodKey) {
  return `${dayIndex}-${periodKey}`;
}

// 공백이나 대소문자 오타로 인한 에러 방지
function normalizeName(s) {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export default function WeekSchedulePanel({ adminPool, loadingAdmins, adminError }) {
  const [week, setWeek] = useState(1);
  
  const [isEdit, setIsEdit] = useState(false);
  const [cells, setCells] = useState([]);
  const [originalCells, setOriginalCells] = useState([]);
  const [draftInputs, setDraftInputs] = useState({});

  const [suggestOpenFor, setSuggestOpenFor] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const gridRef = useRef(null);

  // ✅ 실시간 now (오늘/현재교시 glow)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  
function makeDummyWeek(weekNumber, pool) {
  const items = [];
  for (let d = 0; d < DAYS.length; d++) {
    for (let p = 0; p < PERIODS.length; p++) {
      const pick = pool?.length
        ? pool[(d + p + weekNumber) % pool.length]
        : null;

      items.push({
        dayIndex: d,
        periodKey: PERIODS[p].key,
        admin: pick,
        isSub: false,
      });
    }
  }
  return items;
}

const [loadingSchedule, setLoadingSchedule] = useState(false);
const [scheduleError, setScheduleError] = useState(null);

useEffect(() => {
  if (!adminPool.length) return;

  let alive = true;

  const fetchTodaySchedule = async () => {
    setLoadingSchedule(true);
    setScheduleError(null);

    try {
      const res = await fetch("/api/schedules/today");
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "시간표 불러오기 실패");
      }

      const weekNum = payload?.data?.week_number;
      if (Number.isFinite(Number(weekNum)) && alive) {
        setWeek(Number(weekNum));
      }

      const schedules = payload?.data?.schedules ?? [];
      const nextCells = schedules
        .map((s) => {
          const slot = s?.Timetable_Slots;
          const dayIndex = dayIndexFromKoreanDay(slot?.day_of_week);
          const periodKey = Number(slot?.period_number);

          if (dayIndex == null || !Number.isFinite(periodKey)) return null;

          // admin: 서버 응답(Admin_Users) 우선 사용
          const au = s?.Admin_Users;
          const admin =
            au && (s.assigned_admin_id != null)
              ? {
                  id: s.assigned_admin_id,
                  name: au.name,
                  color: au.color_hex,
                }
              : null;

          return {
            dayIndex,
            periodKey,
            admin,
            isSub: Boolean(s?.is_substitute),
          };
        })
        .filter(Boolean);

      // 혹시 서버가 누락된 칸이 있을 수 있으니, 기본 7*6 그리드로 채우기
      // (없는 칸은 admin=null로)
      const filled = [];
      const mapFromApi = new Map(nextCells.map((c) => [keyOf(c.dayIndex, c.periodKey), c]));
      for (let d = 0; d < DAYS.length; d++) {
        for (let p = 0; p < PERIODS.length; p++) {
          const k = keyOf(d, PERIODS[p].key);
          filled.push(
            mapFromApi.get(k) ?? {
              dayIndex: d,
              periodKey: PERIODS[p].key,
              admin: null,
              isSub: false,
            }
          );
        }
      }

      if (!alive) return;

      setCells(filled);
      setOriginalCells(filled);
      setIsEdit(false);
      setDraftInputs({});
      setSuggestOpenFor(null);
      setHighlightIndex(0);
    } catch (e) {
      if (!alive) return;
      setScheduleError(e?.message || "시간표 불러오기 오류");
    } finally {
      if (!alive) return;
      setLoadingSchedule(false);
    }
  };

  fetchTodaySchedule();

  return () => {
    alive = false;
  };
}, [adminPool]);

const { exactMap, adminById, candidates } = useMemo(() => {
  const byId = new Map();
  const map = new Map();

  adminPool.forEach((a) => {
    byId.set(a.id, a);

    const key = normalizeName(a.name);
    if (key) map.set(key, a.id); // 동명이인 없음 전제
  });

  const list = adminPool.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  return { exactMap: map, adminById: byId, candidates: list };
}, [adminPool]);

  const map = useMemo(() => {
    const m = new Map();
    cells.forEach((c) => m.set(keyOf(c.dayIndex, c.periodKey), c));
    return m;
  }, [cells]);

  const originalMap = useMemo(() => {
    const m = new Map();
    originalCells.forEach((c) => m.set(keyOf(c.dayIndex, c.periodKey), c));
    return m;
  }, [originalCells]);

  useEffect(() => {
    if (!isEdit) return;

    const init = {};
    for (const c of cells) {
      const k = keyOf(c.dayIndex, c.periodKey);
      init[k] = {
        text: c.admin?.name ?? "",
        resolvedAdminId: c.admin?.id ?? null,
        error: null,
      };
    }
    setDraftInputs(init);
    setSuggestOpenFor(null);
    setHighlightIndex(0);
  }, [isEdit, cells]);

  useEffect(() => {
    const onDown = (e) => {
      const root = gridRef.current;
      if (!root) return;
      if (!root.contains(e.target)) {
        setSuggestOpenFor(null);
        setHighlightIndex(0);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function resolveText(text) {
    const n = normalizeName(text);
    if (!n) return { resolvedAdminId: null, error: null };

    const id = exactMap.get(n);
    if (id) return { resolvedAdminId: id, error: null };

    return { resolvedAdminId: null, error: "매칭되는 사람이 없어요." };
  }

  function setCellText(cellKey, nextText) {
    setDraftInputs((prev) => {
      const { resolvedAdminId, error } = resolveText(nextText);
      return {
        ...prev,
        [cellKey]: {
          ...prev[cellKey],
          text: nextText,
          resolvedAdminId,
          error,
        },
      };
    });
  }

  function revertCell(cellKey) {
    const orig = originalMap.get(cellKey);
    setDraftInputs((prev) => ({
      ...prev,
      [cellKey]: {
        text: orig?.admin?.name ?? "",
        resolvedAdminId: orig?.admin?.id ?? null,
        error: null,
      },
    }));
  }

  function applySuggestion(cellKey, adminId) {
    const admin = adminById.get(adminId);
    setDraftInputs((prev) => ({
      ...prev,
      [cellKey]: {
        text: admin?.name ?? "",
        resolvedAdminId: admin?.id ?? null,
        error: null,
      },
    }));
    setSuggestOpenFor(null);
    setHighlightIndex(0);
  }

  function focusCellByDelta(fromKey, delta) {
    const inputs = gridRef.current?.querySelectorAll?.("[data-tt-input='1']");
    if (!inputs?.length) return;
    const arr = Array.from(inputs);
    const idx = arr.findIndex((el) => el.getAttribute("data-tt-key") === fromKey);
    if (idx < 0) return;
    const nextIdx = Math.max(0, Math.min(arr.length - 1, idx + delta));
    const next = arr[nextIdx];
    next?.focus?.();
    next?.select?.();
  }

  const { hasErrors, dirtyCount, isDirty } = useMemo(() => {
    if (!isEdit) return { hasErrors: false, dirtyCount: 0, isDirty: false };

    let errors = 0;
    let dirty = 0;

    for (const c of cells) {
      const k = keyOf(c.dayIndex, c.periodKey);
      const di = draftInputs[k];
      if (di?.error) errors += 1;

      const orig = originalMap.get(k);
      const origId = orig?.admin?.id ?? null;

      const n = normalizeName(di?.text ?? "");
      const nextId = n === "" ? null : di?.resolvedAdminId ?? null;

      if (origId !== nextId) dirty += 1;
    }

    return { hasErrors: errors > 0, dirtyCount: dirty, isDirty: dirty > 0 };
  }, [isEdit, draftInputs, cells, originalMap]);

  const suggestions = useMemo(() => {
    if (!isEdit || !suggestOpenFor) return [];
    const q = normalizeName(draftInputs[suggestOpenFor]?.text ?? "");
    const list = q ? candidates.filter((c) => normalizeName(c.name).includes(q)) : candidates.slice();
    return list.slice(0, 8);
  }, [isEdit, suggestOpenFor, draftInputs, candidates]);

  useEffect(() => {
    if (highlightIndex >= suggestions.length) setHighlightIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions.length]);

  const onSave = async () => {
    if (!isEdit || hasErrors || !isDirty) return;

    const next = cells.map((c) => {
      const k = keyOf(c.dayIndex, c.periodKey);
      const di = draftInputs[k];

      const n = normalizeName(di?.text ?? "");
      const orig = originalMap.get(k);
      const origId = orig?.admin?.id ?? null;

      if (!n) {
        const changed = origId !== null;
        return { ...c, admin: null, isSub: changed ? true : false };
      }

      if (di?.resolvedAdminId) {
        const admin = adminById.get(di.resolvedAdminId);
        const changed = origId !== admin?.id;
        return {
          ...c,
          admin: admin ? { id: admin.id, name: admin.name, color: admin.color } : null,
          isSub: changed ? true : c.isSub,
        };
      }

      return c;
    });

    setCells(next);
    setOriginalCells(next);
    setIsEdit(false);
    setDraftInputs({});
    setSuggestOpenFor(null);
    setHighlightIndex(0);
  };

  const onCancel = () => {
    if (!isEdit) return;
    if (isDirty) {
      const ok = window.confirm("변경사항이 있어요. 취소하면 모두 사라져요. 취소할까요?");
      if (!ok) return;
    }
    setCells(originalCells);
    setIsEdit(false);
    setDraftInputs({});
    setSuggestOpenFor(null);
    setHighlightIndex(0);
  };

  const todayIndex = useMemo(() => {
    const js = now.getDay(); // 0=일..6=토
    return (js + 6) % 7; // 월=0..일=6
  }, [now]);

  const currentPeriodKey = useMemo(() => {
    for (const p of PERIODS) {
      const w = getPeriodWindow(now, p);
      if (!w) continue;
      if (now >= w.startAt && now <= w.endAt) return p.key;
    }
    return null;
  }, [now]);

  if (loadingAdmins || loadingSchedule) {
    return <Panel title="주차별 시간표">시간표 불러오는 중...</Panel>;
  }

  if (adminError || scheduleError) {
    return <Panel title="주차별 시간표">오류: {adminError || scheduleError}</Panel>;
  }

  return (
    <Panel
      title="주차별 시간표"
      right={
        <div className={styles.rightControls}>
          <WeekPager week={week} onChangeWeek={setWeek} />
          {isEdit ? (
            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={onCancel}>
                취소
              </button>
              <button
                className={styles.saveBtn}
                onClick={onSave}
                disabled={hasErrors || !isDirty}
                title={hasErrors ? "오류를 먼저 해결해줘요" : !isDirty ? "변경사항이 없어요" : "저장"}
              >
                저장
              </button>
            </div>
          ) : (
            <button className={`${styles.editBtn} ${isEdit ? styles.editOn : ""}`} onClick={() => setIsEdit(true)} title="시간표 수정">
              ✏️
            </button>
          )}
        </div>
      }
      className={styles.panelFull}
      bodyClassName={styles.noScrollBody}
    >
      {isEdit && (
        <div className={styles.editHint}>
          (Enter: 다음 / Shift+Enter: 이전 / Tab: 후보 적용 / ↑↓: 후보 이동 / Esc: 현재 칸 원복)
          {hasErrors && <span className={styles.hintError}> — 오류가 있어 저장할 수 없어요</span>}
          {!hasErrors && isDirty && <span className={styles.hintDirty}> — 변경 {dirtyCount}개</span>}
        </div>
      )}

      <div className={styles.grid} ref={gridRef}>
        <div className={styles.corner} />

        {DAYS.map((d, idx) => (
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
              const cellKey = keyOf(dayIndex, p.key);
              const committed = map.get(cellKey);

              const di = isEdit ? draftInputs[cellKey] : null;
              const text = isEdit ? di?.text ?? "" : committed?.admin?.name ?? "";
              const hasError = isEdit ? Boolean(di?.error) : false;

              const showSuggest = isEdit && suggestOpenFor === cellKey && suggestions.length > 0;

              const isTodayCol = dayIndex === todayIndex;
              const isNowCell = isTodayCol && currentPeriodKey === p.key;

              return (
                <div
                  key={cellKey}
                  className={[
                    styles.cell,
                    isEdit ? styles.editable : "",
                    committed?.isSub ? styles.substitute : "",
                    hasError ? styles.errorCell : "",
                    isTodayCol ? styles.todayCol : "",
                    isNowCell ? styles.nowGlow : "",
                  ].join(" ")}
                  style={{
                    backgroundColor: hexToRgba(
                      isEdit
                        ? di?.resolvedAdminId
                          ? adminById.get(di.resolvedAdminId)?.color
                          : committed?.admin?.color
                        : committed?.admin?.color,
                      0.12
                    ),
                  }}
                >
                  <div className={styles.adminRow}>
                    <span
                      className={styles.colorDot}
                      style={{
                        backgroundColor:
                          isEdit && di?.resolvedAdminId
                            ? adminById.get(di.resolvedAdminId)?.color
                            : committed?.admin?.color ?? "rgba(0,0,0,0.18)",
                      }}
                    />

                    {isEdit ? (
                      <div className={styles.inputWrap}>
                        <input
                          data-tt-input="1"
                          data-tt-key={cellKey}
                          className={styles.nameInput}
                          value={text}
                          placeholder="(빈칸)"
                          onFocus={() => {
                            setSuggestOpenFor(cellKey);
                            setHighlightIndex(0);
                          }}
                          onChange={(e) => {
                            setCellText(cellKey, e.target.value);
                            setSuggestOpenFor(cellKey);
                          }}
                          onKeyDown={(e) => {
                            if (showSuggest) {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
                                return;
                              }
                              if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setHighlightIndex((i) => Math.max(i - 1, 0));
                                return;
                              }
                              if (e.key === "Tab") {
                                if (suggestions[highlightIndex]) {
                                  e.preventDefault();
                                  applySuggestion(cellKey, suggestions[highlightIndex].id);
                                  return;
                                }
                              }
                              if (e.key === "Enter") {
                                if (!di?.resolvedAdminId && suggestions[highlightIndex]) {
                                  e.preventDefault();
                                  applySuggestion(cellKey, suggestions[highlightIndex].id);
                                  focusCellByDelta(cellKey, e.shiftKey ? -1 : 1);
                                  return;
                                }
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                revertCell(cellKey);
                                setSuggestOpenFor(null);
                                setHighlightIndex(0);
                                return;
                              }
                            }

                            if (e.key === "Enter") {
                              e.preventDefault();
                              focusCellByDelta(cellKey, e.shiftKey ? -1 : 1);
                              return;
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              revertCell(cellKey);
                              setSuggestOpenFor(null);
                              setHighlightIndex(0);
                              return;
                            }
                          }}
                        />

                        {hasError && <div className={styles.errorMsg}>{di?.error}</div>}

                        {showSuggest && (
                          <div className={styles.suggestBox}>
                            <div className={styles.suggestTop}>↑↓ 이동 · Tab/Enter 적용 · Esc 원복</div>

                            {suggestions.map((s, idx) => (
                              <button
                                type="button"
                                key={s.id}
                                className={[styles.suggestItem, idx === highlightIndex ? styles.suggestActive : ""].join(" ")}
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  applySuggestion(cellKey, s.id);
                                }}
                              >
                                {s.name}
                              </button>
                            ))}

                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={styles.adminName}>{committed?.admin?.name ?? ""}</span>
                    )}

                    {committed?.isSub && <span className={styles.subBadge}>대타</span>}
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