<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState } from "react";
=======
import { useEffect, useMemo, useState } from "react";
>>>>>>> origin/main
import Panel from "../../../components/layout/Panel";
import WeekPager from "./WeekPager";
import styles from "./WeekSchedulePanel.module.css";

<<<<<<< HEAD
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const PERIODS = [
  { key: 1, label: "1교시", start: "09:00", end: "10:15" },
  { key: 2, label: "2교시", start: "10:30", end: "11:45" },
  { key: 3, label: "3교시", start: "12:00", end: "13:15" },
  { key: 4, label: "4교시", start: "13:30", end: "14:45" },
  { key: 5, label: "5교시", start: "15:00", end: "16:15" },
  { key: 6, label: "6교시", start: "16:30", end: "17:45" },
  { key: 7, label: "저녁", start: "18:00", end: "" }, // end 없으면 기본 2시간 처리
];

// ✅ (임시) 관리자 후보 풀
const ADMIN_POOL = [
  { id: "a1", name: "다솔", color: "#60a5fa", aliases: ["윤다솔", "dasol"] },
  { id: "a2", name: "준일", color: "#34d399", aliases: ["joonil"] },
  { id: "a3", name: "예원", color: "#fbbf24", aliases: ["yewon"] },
=======
const DAYS = ["월", "화", "수", "목", "금"];
const PERIODS = [
  { key: 1, label: "1교시", start: "09:00", end: "10:15" },
  { key: 2, label: "2교시", start: "10:30", end: "11:45" },
  { key: 3, label: "3교시", start: "12:00", end: "12:00" },
  { key: 4, label: "4교시", start: "13:30", end: "14:45" },
  { key: 5, label: "5교시", start: "15:00", end: "16:15" },
  { key: 6, label: "6교시", start: "16:30", end: "17:45" },
  { key: 7, label: "저녁", start: "18:00", end: "" },
>>>>>>> origin/main
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

<<<<<<< HEAD
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

function makeDummyWeek(weekNumber) {
  const items = [];
  for (let d = 0; d < DAYS.length; d++) {
    for (let p = 0; p < PERIODS.length; p++) {
      const pick = ADMIN_POOL[(d + p + weekNumber) % ADMIN_POOL.length];
=======
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
>>>>>>> origin/main
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

<<<<<<< HEAD
function normalizeName(s) {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export default function WeekSchedulePanel() {
  const [week, setWeek] = useState(1);

  const [isEdit, setIsEdit] = useState(false);
  const [cells, setCells] = useState(() => makeDummyWeek(week));
  const [originalCells, setOriginalCells] = useState(() => makeDummyWeek(week));
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

  useEffect(() => {
    const next = makeDummyWeek(week);
    setCells(next);
    setOriginalCells(next);
    setIsEdit(false);
    setDraftInputs({});
    setSuggestOpenFor(null);
    setHighlightIndex(0);
  }, [week]);

  const { exactMap, adminById, duplicateKeys, candidates } = useMemo(() => {
    const byId = new Map();
    ADMIN_POOL.forEach((a) => byId.set(a.id, a));

    const counts = new Map();
    const occurrences = [];
    ADMIN_POOL.forEach((a) => {
      const keys = [a.name, ...(a.aliases ?? [])].map(normalizeName).filter(Boolean);
      keys.forEach((k) => {
        counts.set(k, (counts.get(k) ?? 0) + 1);
        occurrences.push({ key: k, adminId: a.id });
      });
    });

    const dup = new Set();
    for (const [k, c] of counts.entries()) if (c > 1) dup.add(k);

    const map = new Map();
    occurrences.forEach((o) => {
      if (!dup.has(o.key)) map.set(o.key, o.adminId);
    });

    const list = ADMIN_POOL.map((a) => ({ id: a.id, name: a.name }));

    return { exactMap: map, adminById: byId, duplicateKeys: dup, candidates: list };
  }, []);

=======
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
>>>>>>> origin/main
  const map = useMemo(() => {
    const m = new Map();
    cells.forEach((c) => m.set(keyOf(c.dayIndex, c.periodKey), c));
    return m;
  }, [cells]);

<<<<<<< HEAD
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

    if (duplicateKeys.has(n)) {
      return { resolvedAdminId: null, error: "동명이인/중복 별칭이 있어요. 더 정확히 입력해줘요." };
    }

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

=======
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

>>>>>>> origin/main
  return (
    <Panel
      title="주차별 시간표"
      right={
        <div className={styles.rightControls}>
          <WeekPager week={week} onChangeWeek={setWeek} />
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
        </div>
      }
      className={styles.panelFull}
      bodyClassName={styles.noScrollBody}
    >
<<<<<<< HEAD
      {isEdit && (
        <div className={styles.editHint}>
          이름을 입력하면 자동 배정돼요. 공백이면 빈칸. (Enter: 다음 / Shift+Enter: 이전 / Tab: 후보 적용 / ↑↓: 후보 이동 / Esc: 현재 칸 원복)
          {hasErrors && <span className={styles.hintError}> — 오류가 있어 저장할 수 없어요</span>}
          {!hasErrors && isDirty && <span className={styles.hintDirty}> — 변경 {dirtyCount}개</span>}
        </div>
      )}

      <div className={styles.grid} ref={gridRef}>
        <div className={styles.corner} />

        {DAYS.map((d, idx) => (
          <div key={d} className={`${styles.dayHeader} ${idx === todayIndex ? styles.todayHeader : ""}`}>
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
                >
                  <div className={styles.adminRow}>
                    <span
                      className={styles.colorDot}
<<<<<<< HEAD
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

                            <div className={styles.suggestBottom}>* 정확히 매칭되면 자동 배정, 아니면 후보에서 선택해줘요.</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={styles.adminName}>{committed?.admin?.name ?? ""}</span>
                    )}

                    {committed?.isSub && <span className={styles.subBadge}>대타</span>}
=======
                      style={{ backgroundColor: cell?.admin.color }}
                    />
                    <span className={styles.adminName}>{cell?.admin.name}</span>
                    {cell?.isSub && <span className={styles.subBadge}>대타</span>}
>>>>>>> origin/main
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