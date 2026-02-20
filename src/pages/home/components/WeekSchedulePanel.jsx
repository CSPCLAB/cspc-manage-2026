import { useEffect, useMemo, useRef, useState } from "react";
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

// ✅ (임시) 관리자 후보 풀: DB 붙이면 여기 대신 members/admins를 props나 fetch로 받으면 됨
const ADMIN_POOL = [
  { id: "a1", name: "다솔", color: "#60a5fa", aliases: ["윤다솔", "dasol"] },
  { id: "a2", name: "준일", color: "#34d399", aliases: ["joonil"] },
  { id: "a3", name: "예원", color: "#fbbf24", aliases: ["yewon"] },
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
  const admins = ADMIN_POOL;

  const items = [];
  for (let d = 0; d < DAYS.length; d++) {
    for (let p = 0; p < PERIODS.length; p++) {
      const pick = admins[(d + p + weekNumber) % admins.length];
      items.push({
        dayIndex: d,
        periodKey: PERIODS[p].key,
        admin: pick, // {id,name,color}
        isSub: (d + p + weekNumber) % 7 === 0,
      });
    }
  }
  return items;
}

function keyOf(dayIndex, periodKey) {
  return `${dayIndex}-${periodKey}`;
}

function normalizeName(s) {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export default function WeekSchedulePanel() {
  const [week, setWeek] = useState(1);

  // ✅ 편집 모드
  const [isEdit, setIsEdit] = useState(false);

  // ✅ 커밋된(실제) 주차별 시간표
  const [cells, setCells] = useState(() => makeDummyWeek(week));

  // ✅ 편집 초기에 스냅샷 (취소 시 복구용)
  const [originalCells, setOriginalCells] = useState(() => makeDummyWeek(week));

  // ✅ 입력 드래프트: key -> { text, resolvedAdminId, error }
  const [draftInputs, setDraftInputs] = useState({});

  // ✅ 자동완성 상태
  const [suggestOpenFor, setSuggestOpenFor] = useState(null); // cellKey
  const [highlightIndex, setHighlightIndex] = useState(0);

  const gridRef = useRef(null);

  // 주차 바뀌면 해당 주차 데이터 로드(지금은 더미)
  useEffect(() => {
    const next = makeDummyWeek(week);
    setCells(next);
    setOriginalCells(next);
    setIsEdit(false);
    setDraftInputs({});
    setSuggestOpenFor(null);
    setHighlightIndex(0);
  }, [week]);

  // ✅ 이름 매칭 맵 + 후보 목록
  const { exactMap, adminById, duplicateKeys, candidates } = useMemo(() => {
    const byId = new Map();
    ADMIN_POOL.forEach((a) => byId.set(a.id, a));

    // normalized key -> adminId (unique only)
    const counts = new Map();
    const occurrences = []; // {key, adminId}
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

  // 빠른 조회 맵(현재 커밋 cells)
  const map = useMemo(() => {
    const m = new Map();
    cells.forEach((c) => m.set(keyOf(c.dayIndex, c.periodKey), c));
    return m;
  }, [cells]);

  // 오리지널 조회 맵(취소/dirty 비교)
  const originalMap = useMemo(() => {
    const m = new Map();
    originalCells.forEach((c) => m.set(keyOf(c.dayIndex, c.periodKey), c));
    return m;
  }, [originalCells]);

  // 편집 진입 시 draftInputs 초기화
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

  // 문서 바깥 클릭 시 자동완성 닫기
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
      return {
        resolvedAdminId: null,
        error: "동명이인/중복 별칭이 있어요. 더 정확히 입력해줘요.",
      };
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
    const list = q
      ? candidates.filter((c) => normalizeName(c.name).includes(q))
      : candidates.slice();
    return list.slice(0, 8);
  }, [isEdit, suggestOpenFor, draftInputs, candidates]);

  useEffect(() => {
    if (highlightIndex >= suggestions.length) setHighlightIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions.length]);

  // ✅ 저장: draftInputs -> cells로 커밋
  const onSave = async () => {
    if (!isEdit || hasErrors || !isDirty) return;

    const next = cells.map((c) => {
      const k = keyOf(c.dayIndex, c.periodKey);
      const di = draftInputs[k];

      const n = normalizeName(di?.text ?? "");
      const orig = originalMap.get(k);
      const origId = orig?.admin?.id ?? null;

      // 빈칸
      if (!n) {
        const changed = origId !== null;
        return {
          ...c,
          admin: null,
          isSub: changed ? true : false, // 정책: 변경 발생하면 대타 표시
        };
      }

      // 매칭 성공
      if (di?.resolvedAdminId) {
        const admin = adminById.get(di.resolvedAdminId);
        const changed = origId !== admin?.id;
        return {
          ...c,
          admin: admin ? { id: admin.id, name: admin.name, color: admin.color } : null,
          isSub: changed ? true : c.isSub,
        };
      }

      // 매칭 실패(원래는 저장 버튼이 막혀서 여기 안 옴)
      return c;
    });

    // TODO: 여기서 백엔드 저장 요청 (week 포함)
    // await api.put(`/weekly-schedules/${week}`, next)

    setCells(next);
    setOriginalCells(next);
    setIsEdit(false);
    setDraftInputs({});
    setSuggestOpenFor(null);
    setHighlightIndex(0);
  };

  // ✅ 취소: originalCells로 복구
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
            <button
              className={`${styles.editBtn} ${isEdit ? styles.editOn : ""}`}
              onClick={() => setIsEdit(true)}
              title="시간표 수정"
            >
              ✏️
            </button>
          )}
        </div>
      }
      className={styles.panelFull}
      bodyClassName={styles.noScrollBody}
    >
      {/* 편집 모드 안내 */}
      {isEdit && (
        <div className={styles.editHint}>
          이름을 입력하면 자동 배정돼요. 공백이면 빈칸. (Enter: 다음 / Shift+Enter: 이전 / Tab: 후보 적용 /
          ↑↓: 후보 이동 / Esc: 현재 칸 원복)
          {hasErrors && <span className={styles.hintError}> — 오류가 있어 저장할 수 없어요</span>}
          {!hasErrors && isDirty && <span className={styles.hintDirty}> — 변경 {dirtyCount}개</span>}
        </div>
      )}

      <div className={styles.grid} ref={gridRef}>
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
              const cellKey = keyOf(dayIndex, p.key);
              const committed = map.get(cellKey);

              const di = isEdit ? draftInputs[cellKey] : null;
              const text = isEdit ? di?.text ?? "" : committed?.admin?.name ?? "";
              const hasError = isEdit ? Boolean(di?.error) : false;

              const showSuggest =
                isEdit && suggestOpenFor === cellKey && suggestions.length > 0;

              return (
                <div
                  key={cellKey}
                  className={[
                    styles.cell,
                    isEdit ? styles.editable : "",
                    committed?.isSub ? styles.substitute : "",
                    hasError ? styles.errorCell : "",
                  ].join(" ")}
                  style={{
                    backgroundColor: hexToRgba(
                      isEdit
                        ? (di?.resolvedAdminId ? adminById.get(di.resolvedAdminId)?.color : committed?.admin?.color)
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
                            <div className={styles.suggestTop}>
                              ↑↓ 이동 · Tab/Enter 적용 · Esc 원복
                            </div>

                            {suggestions.map((s, idx) => (
                              <button
                                type="button"
                                key={s.id}
                                className={[
                                  styles.suggestItem,
                                  idx === highlightIndex ? styles.suggestActive : "",
                                ].join(" ")}
                                onMouseDown={(ev) => {
                                  ev.preventDefault(); // input blur 방지
                                  applySuggestion(cellKey, s.id);
                                }}
                              >
                                {s.name}
                              </button>
                            ))}

                            <div className={styles.suggestBottom}>
                              * 정확히 매칭되면 자동 배정, 아니면 후보에서 선택해줘요.
                            </div>
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