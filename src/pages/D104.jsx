import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * 실습실 PC 배치도 (전자교탁 왼쪽) + 클릭하면 우측 패널에 PC 정보/요청 표시
 * - 번호는 "위에서부터 1,2,3..." 순으로 자동 부여
 * - DB 스키마 느낌:
 *   - Lab_Computers: manufacturer/model/serial_number/is_broken 등
 *   - Repair_Logs: 컴퓨터별 요청 로그 (요청 내용)
 *
 * 🎨 테마: 따뜻한 뉴트럴 (베이지/슬레이트)
 */

// ─── 컬러 팔레트 ──────────────────────────────────────────────────
// 배경     : #f5f0eb  (따뜻한 오프화이트)
// 카드     : #fdfaf7  (크림화이트)
// 테두리   : #e2d9cf  (따뜻한 베이지 보더)
// 텍스트   : #2d2822  (다크 웜브라운)
// 서브텍스트: #7a6e64  (미디엄 웜브라운)
// 액센트   : #5c5248  (슬레이트 브라운 - 버튼/활성)
// 선택(PC) : #3d342c  (딥 워머 슬레이트)
// 정상(초록): #c8e6c4 / #2a5c30
// 고장(빨강): #f0c4c4 / #7c2424
// ─────────────────────────────────────────────────────────────────

export default function D104() {
  const COLS = 10;
  const PODIUM_ROW_INDEX = 5;

  const rowNums = (start) =>
    start == null
      ? Array(COLS).fill(null)
      : Array.from({ length: COLS }, (_, i) => start + i);

  const grid = useMemo(
    () => [
      rowNums(1),
      rowNums(11),
      rowNums(null),
      rowNums(21),
      rowNums(31),
      rowNums(null),
      rowNums(41),
      rowNums(51),
      rowNums(null),
      rowNums(61),
      rowNums(71),
    ],
    []
  );

  const allSeats = useMemo(() => {
    const out = [];
    for (const row of grid)
      for (const cell of row)
        if (typeof cell === "number") out.push(cell);
    return out;
  }, [grid]);

  const LOCATION = "D104";

  const [computers, setComputers] = useState(() =>
    allSeats.map((n) => ({
      id: n,
      location: LOCATION,
      computer_number: n,
      is_broken: false,
      manufacturer: "",
      model: "",
      serial_number: "",
    }))
  );

  useEffect(() => {
    setComputers((prev) => {
      const exist = new Set(prev.map((c) => c.id));
      const add = allSeats
        .filter((n) => !exist.has(n))
        .map((n) => ({
          id: n,
          location: LOCATION,
          computer_number: n,
          is_broken: false,
          manufacturer: "",
          model: "",
          serial_number: "",
        }));
      return add.length ? [...prev, ...add].sort((a, b) => a.id - b.id) : prev;
    });
  }, [allSeats]);

  const [selectedComputerId, setSelectedComputerId] = useState(allSeats[0] ?? 1);

  const selectedComputer = useMemo(
    () => computers.find((c) => c.id === selectedComputerId) ?? computers[0],
    [computers, selectedComputerId]
  );

  const updateSelectedComputer = (patch) => {
    setComputers((prev) =>
      prev.map((c) => (c.id === selectedComputerId ? { ...c, ...patch } : c))
    );
  };

  const [repairLogs, setRepairLogs] = useState([]);

  const hasOpenLogMap = useMemo(() => {
    const map = {};
    for (const r of repairLogs) {
      map[r.computer_id] = true;
    }
    return map;
  }, [repairLogs]);

  const isBroken = (computerId) =>
    !!computers.find((c) => c.id === computerId)?.is_broken;

  const hasOpenLogs = (computerId) => !!hasOpenLogMap[computerId];

  const [isEditingComputer, setIsEditingComputer] = useState(false);
  const [computerDraft, setComputerDraft] = useState({
    manufacturer: "",
    model: "",
    serial_number: "",
    is_broken: false,
  });

  useEffect(() => {
    if (!selectedComputer) return;
    if (isEditingComputer) return;
    setComputerDraft({
      manufacturer: selectedComputer.manufacturer ?? "",
      model: selectedComputer.model ?? "",
      serial_number: selectedComputer.serial_number ?? "",
      is_broken: !!selectedComputer.is_broken,
    });
  }, [selectedComputerId, selectedComputer, isEditingComputer]);

  const startEditComputer = () => {
    if (!selectedComputer) return;
    setComputerDraft({
      manufacturer: selectedComputer.manufacturer ?? "",
      model: selectedComputer.model ?? "",
      serial_number: selectedComputer.serial_number ?? "",
      is_broken: !!selectedComputer.is_broken,
    });
    setIsEditingComputer(true);
  };

  const cancelEditComputer = () => {
    if (!selectedComputer) {
      setIsEditingComputer(false);
      return;
    }
    setComputerDraft({
      manufacturer: selectedComputer.manufacturer ?? "",
      model: selectedComputer.model ?? "",
      serial_number: selectedComputer.serial_number ?? "",
      is_broken: !!selectedComputer.is_broken,
    });
    setIsEditingComputer(false);
  };

  const saveComputerDraft = () => {
    updateSelectedComputer({
      manufacturer: computerDraft.manufacturer,
      model: computerDraft.model,
      serial_number: computerDraft.serial_number,
      is_broken: !!computerDraft.is_broken,
    });
    setIsEditingComputer(false);
  };

  const [category, setCategory] = useState("선택");
  const [requestText, setRequestText] = useState("");

  const filtered = useMemo(
    () => repairLogs.filter((r) => r.computer_id === selectedComputerId),
    [repairLogs, selectedComputerId]
  );

  const onSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (category === "선택") {
      alert("카테고리 선택부터 하셈");
      return;
    }
    if (!requestText.trim()) {
      alert("요청 내용 비우면 안 됨");
      return;
    }

    setRepairLogs((prev) => [
      {
        id: Date.now(),
        computer_id: selectedComputerId,
        category,
        title: requestText.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    // 요청이 등록되면 자동으로 '고장' 상태로 전환 (배치도 빨강)
    updateSelectedComputer({ is_broken: true });
    // 편집 모드라면 draft도 즉시 반영
    if (isEditingComputer) {
      setComputerDraft((d) => ({ ...d, is_broken: true }));
    }

    setCategory("선택");
    setRequestText("");
  };

  // ====== 🎨 따뜻한 뉴트럴 테마 스타일 ======
  const C = {
    bg:           "#f5f0eb",
    card:         "#fdfaf7",
    border:       "#e2d9cf",
    borderMed:    "#cdc3b8",
    text:         "#2d2822",
    subtext:      "#7a6e64",
    accent:       "#5c5248",
    accentHover:  "#3d342c",
    pcNormal:     "#c8e6c4",
    pcNormalText: "#2a5c30",
    pcBroken:     "#f0c4c4",
    pcBrokenText: "#7c2424",
    pcSelected:   "#3d342c",
    podium:       "#e8e2db",
    podiumText:   "#5c5248",
    tagGreen:     "#d4ebe0",
    tagGreenText: "#1e5c3a",
    tagAmber:     "#f0e8d8",
    tagAmberText: "#7a4f1e",
    tagSlate:     "#e3ddd8",
    tagSlateText: "#4a3f35",
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: C.bg,
      padding: 22,
      boxSizing: "border-box",
      fontFamily:
        "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif, system-ui",
      color: C.text,
    },

    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 18px",
      borderRadius: 16,
      background: C.card,
      border: `1px solid ${C.border}`,
      boxShadow: "0 4px 20px rgba(92,82,72,.07)",
      marginBottom: 16,
    },

    brand: { display: "flex", alignItems: "center", gap: 12 },

    navRow: { display: "flex", gap: 8, marginBottom: 6 },

    navPill: {
      textDecoration: "none",
      padding: "5px 12px",
      borderRadius: 999,
      border: `1px solid ${C.border}`,
      background: C.card,
      color: C.subtext,
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: "0.3px",
    },

    navPillActive: {
      textDecoration: "none",
      padding: "5px 12px",
      borderRadius: 999,
      border: `1px solid ${C.accent}`,
      background: C.accent,
      color: "#fdfaf7",
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: "0.3px",
    },

    title: {
      margin: 0,
      fontSize: 16,
      fontWeight: 700,
      color: C.text,
      letterSpacing: "-0.2px",
    },

    sub: {
      margin: 0,
      marginTop: 2,
      fontSize: 12,
      color: C.subtext,
    },

    linkBtn: {
      textDecoration: "none",
      padding: "8px 14px",
      borderRadius: 12,
      border: `1px solid ${C.accent}`,
      background: C.accent,
      color: "#fdfaf7",
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: "0.3px",
    },

    layout: {
      display: "grid",
      gridTemplateColumns: "1fr 380px",
      gap: 16,
      alignItems: "start",
    },

    card: {
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      boxShadow: "0 4px 20px rgba(92,82,72,.07)",
      color: C.text,
    },

    leftWrap: { padding: 18 },

    leftHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 14,
    },

    leftHeaderTitle: {
      fontWeight: 700,
      color: C.text,
      fontSize: 14,
    },

    leftHeaderHint: {
      fontSize: 12,
      color: C.subtext,
    },

    roomFrame: {
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: 16,
    },

    grid: {
      display: "grid",
      gridTemplateColumns: `repeat(${COLS}, 1fr)`,
      gap: 10,
      alignItems: "stretch",
    },

    cellEmpty: {
      height: 54,
      borderRadius: 14,
      border: `1px dashed ${C.border}`,
      background: "transparent",
      boxSizing: "border-box",
    },

    cellPodium: {
      height: 54,
      borderRadius: 14,
      border: `1px solid ${C.borderMed}`,
      background: C.podium,
      display: "grid",
      placeItems: "center",
      fontWeight: 700,
      fontSize: 12,
      color: C.podiumText,
      userSelect: "none",
      boxSizing: "border-box",
      letterSpacing: "0.3px",
    },

    cellPc: (active, hasReq) => ({
      height: 54,
      borderRadius: 14,
      border: active
        ? `2px solid ${C.accentHover}`
        : hasReq
        ? `1px solid #d49a9a`
        : `1px solid #8fbb8c`,
      background: active
        ? C.pcSelected
        : hasReq
        ? C.pcBroken
        : C.pcNormal,
      color: active ? "#fdfaf7" : hasReq ? C.pcBrokenText : C.pcNormalText,
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      fontWeight: 700,
      fontSize: 12,
      userSelect: "none",
      boxSizing: "border-box",
      transition: "background 0.15s, border-color 0.15s",
    }),

    formWrap: { padding: 18 },

    infoCard: {
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      background: C.card,
      padding: 14,
      marginBottom: 14,
    },

    infoHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 10,
      marginBottom: 12,
    },

    infoTitle: {
      fontSize: 13,
      fontWeight: 700,
      margin: 0,
      color: C.text,
    },

    infoMeta: { fontSize: 11, color: C.subtext },

    formTitleRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 14,
      gap: 10,
    },

    formTitle: {
      fontSize: 14,
      fontWeight: 700,
      margin: 0,
      color: C.text,
    },

    pcPill: {
      padding: "5px 11px",
      borderRadius: 999,
      border: `1px solid ${C.border}`,
      background: C.bg,
      color: C.subtext,
      fontSize: 11,
      fontWeight: 700,
    },

    field: { display: "grid", gap: 6, marginBottom: 12 },

    label: {
      fontSize: 12,
      fontWeight: 700,
      color: C.subtext,
      letterSpacing: "0.2px",
    },

    input: {
      width: "100%",
      height: 40,
      padding: "0 12px",
      borderRadius: 10,
      border: `1px solid ${C.border}`,
      background: C.bg,
      color: C.text,
      outline: "none",
      boxSizing: "border-box",
      fontSize: 13,
    },

    select: {
      width: "100%",
      height: 40,
      padding: "0 12px",
      borderRadius: 10,
      border: `1px solid ${C.border}`,
      background: C.bg,
      color: C.text,
      outline: "none",
      boxSizing: "border-box",
      fontSize: 13,
    },


    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },

    hint: { fontSize: 11, color: C.subtext, marginTop: 2 },

    submit: {
      width: "100%",
      height: 44,
      borderRadius: 12,
      border: `1px solid ${C.accent}`,
      background: C.accent,
      color: "#fdfaf7",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 14,
      letterSpacing: "0.3px",
      transition: "background 0.15s",
    },

    listWrap: { marginTop: 14 },

    bigBox: {
      height: 280,
      borderRadius: 14,
      background: C.bg,
      border: `1px solid ${C.border}`,
      padding: 14,
      boxSizing: "border-box",
      overflow: "auto",
      color: C.text,
    },

    listTitle: {
      fontSize: 13,
      fontWeight: 700,
      margin: "0 0 10px 0",
      color: C.text,
    },

    item: {
      padding: 12,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      background: C.card,
      marginBottom: 10,
    },

    itemTop: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },

    badgeRow: { display: "flex", gap: 6, alignItems: "center" },

    badge: (tone) => {
      const map = {
        gray:  { bg: C.tagSlate,  fg: C.tagSlateText },
        red:   { bg: C.pcBroken,  fg: "#7c2424" },
        green: { bg: C.tagGreen,  fg: C.tagGreenText },
        blue:  { bg: C.tagAmber,  fg: C.tagAmberText },
      };
      const t = map[tone] ?? map.gray;
      return {
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: t.bg,
        color: t.fg,
        letterSpacing: "0.2px",
      };
    },

    itemTitle: {
      fontWeight: 700,
      margin: "8px 0 6px 0",
      color: C.text,
      fontSize: 13,
    },

    itemBody: {
      margin: 0,
      fontSize: 13,
      lineHeight: 1.5,
      color: C.subtext,
    },

    smallBtn: {
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${C.border}`,
      background: C.card,
      color: C.subtext,
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
    },

    timeText: { fontSize: 11, color: C.subtext },

    note: { fontSize: 11, color: C.subtext, marginTop: 10 },
  };


  const categoryTone = (c) =>
    c === "시설" ? "green" : c === "비품" ? "green" : "gray";

  return (
    <div style={styles.page}>
      {/* ── 상단 바 ── */}
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <div>
            <div style={styles.navRow}>
              <Link to="/d104" style={styles.navPillActive}>D104</Link>
              <Link to="/d105" style={styles.navPill}>D105</Link>
            </div>
            <p style={styles.title}>실습실 PC 요청</p>
            <p style={styles.sub}>D104 (배치도) · PC 클릭 → 오른쪽에서 요청 작성</p>
          </div>
        </div>
        <Link to="/" style={styles.linkBtn}>홈으로</Link>
      </div>

      <div style={styles.layout}>
        {/* ── 좌측: 배치도 ── */}
        <div style={styles.card}>
          <div style={styles.leftWrap}>
            <div style={styles.leftHeader}>
              <div style={styles.leftHeaderTitle}>PC 배치도</div>
              <div style={styles.leftHeaderHint}>PC 클릭 → 오른쪽에서 작성</div>
            </div>

            <div style={styles.roomFrame}>
              <div style={styles.grid}>
                {grid.flatMap((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    const key = `${rIdx}-${cIdx}`;

                    if (rIdx === PODIUM_ROW_INDEX) {
                      if (cIdx === 0) {
                        return (
                          <div key={key} style={styles.cellPodium} title="전자교탁">
                            전자교탁
                          </div>
                        );
                      }
                      return <div key={key} style={styles.cellEmpty} />;
                    }

                    if (cell == null) return <div key={key} style={styles.cellEmpty} />;

                    const active = cell === selectedComputerId;
                    return (
                      <div
                        key={key}
                        style={styles.cellPc(active, hasOpenLogs(cell) || isBroken(cell))}
                        onClick={() => setSelectedComputerId(cell)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSelectedComputerId(cell);
                        }}
                        title={`PC ${cell}`}
                      >
                        {cell}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── 컴퓨터 정보 ── */}
            <div style={{ marginTop: 14 }}>
              <div style={styles.infoCard}>
                <div style={styles.infoHead}>
                  <p style={styles.infoTitle}>컴퓨터 정보</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!isEditingComputer ? (
                      <button
                        type="button"
                        onClick={startEditComputer}
                        style={styles.smallBtn}
                      >
                        수정
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={saveComputerDraft}
                          style={{
                            ...styles.smallBtn,
                            background: C.accent,
                            color: "#fdfaf7",
                            border: `1px solid ${C.accent}`,
                          }}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditComputer}
                          style={styles.smallBtn}
                        >
                          취소
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={styles.row2}>
                  <div style={styles.field}>
                    <div style={styles.label}>위치</div>
                    <input
                      value={selectedComputer?.location ?? ""}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.field}>
                    <div style={styles.label}>컴퓨터 번호</div>
                    <input
                      value={String(
                        selectedComputer?.computer_number ?? selectedComputerId
                      )}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.row2}>
                  <div style={styles.field}>
                    <div style={styles.label}>제조사(제품명)</div>
                    <input
                      value={computerDraft.manufacturer}
                      onChange={(e) =>
                        setComputerDraft((d) => ({
                          ...d,
                          manufacturer: e.target.value,
                        }))
                      }
                      style={styles.input}
                      disabled={!isEditingComputer}
                      placeholder="예) Dell / LG / Samsung"
                    />
                  </div>
                  <div style={styles.field}>
                    <div style={styles.label}>모델(머신타입)</div>
                    <input
                      value={computerDraft.model}
                      onChange={(e) =>
                        setComputerDraft((d) => ({
                          ...d,
                          model: e.target.value,
                        }))
                      }
                      style={styles.input}
                      disabled={!isEditingComputer}
                      placeholder="예) OptiPlex 7090"
                    />
                  </div>
                </div>

                <div style={styles.row2}>
                  <div style={styles.field}>
                    <div style={styles.label}>시리얼 넘버</div>
                    <input
                      value={computerDraft.serial_number}
                      onChange={(e) =>
                        setComputerDraft((d) => ({
                          ...d,
                          serial_number: e.target.value,
                        }))
                      }
                      style={styles.input}
                      disabled={!isEditingComputer}
                      placeholder="예) SN1234..."
                    />
                  </div>
                  <div style={styles.field}>
                    <div style={styles.label}>고장 여부</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          isEditingComputer &&
                          setComputerDraft((d) => ({ ...d, is_broken: false }))
                        }
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 10,
                          border: computerDraft.is_broken
                            ? `1px solid ${C.border}`
                            : `1px solid ${C.accent}`,
                          background: computerDraft.is_broken ? C.bg : C.accent,
                          color: computerDraft.is_broken ? C.subtext : "#fdfaf7",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: 13,
                          transition: "background 0.15s",
                        }}
                        aria-pressed={!computerDraft.is_broken}
                        disabled={!isEditingComputer}
                      >
                        정상
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          isEditingComputer &&
                          setComputerDraft((d) => ({ ...d, is_broken: true }))
                        }
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 10,
                          border: computerDraft.is_broken
                            ? `1px solid ${C.pcBrokenText}`
                            : `1px solid ${C.border}`,
                          background: computerDraft.is_broken
                            ? C.pcBrokenText
                            : C.bg,
                          color: computerDraft.is_broken ? "#fdfaf7" : C.subtext,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: 13,
                          transition: "background 0.15s",
                        }}
                        aria-pressed={!!computerDraft.is_broken}
                        disabled={!isEditingComputer}
                      >
                        고장
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── 요청 목록 (비고 자리로 이동) ── */}
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, margin: 0, color: C.text }}>
                      요청 목록
                    </div>
                    <div style={{ fontSize: 11, color: C.subtext }}>
                      선택 PC: {selectedComputer?.computer_number ?? selectedComputerId}
                    </div>
                  </div>

                  <div style={styles.bigBox}>
                    <div style={styles.listTitle}>
                      요청 목록 (PC {selectedComputer?.computer_number ?? selectedComputerId}) ({filtered.length})
                    </div>

                    {filtered.length === 0 ? (
                      <div style={{ fontSize: 13, padding: 10, color: C.subtext }}>
                        아직 요청 없음
                      </div>
                    ) : (
                      filtered.map((r) => (
                        <div key={r.id} style={styles.item}>
                          <div style={styles.itemTop}>
                            <div style={styles.badgeRow}>
                              <span style={styles.badge(categoryTone(r.category))}>{r.category}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={styles.timeText}>{new Date(r.createdAt).toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => setRepairLogs((prev) => prev.filter((x) => x.id !== r.id))}
                                style={styles.smallBtn}
                                title="이 요청 삭제"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                          <div style={styles.itemTitle}>{r.title}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 우측: 전체 요청 모아보기 ── */}
        <div style={styles.card}>
          <div style={styles.formWrap}>
            <div style={styles.formTitleRow}>
              <p style={styles.formTitle}>전체 요청</p>
            </div>

            {/* ── 요청 작성 (전체 요청 위) ── */}
            <div style={styles.infoCard}>
              <div style={styles.infoHead}>
                <p style={styles.infoTitle}>요청 작성</p>
                <div style={styles.infoMeta}>
                  선택 PC: {selectedComputer?.computer_number ?? selectedComputerId}
                </div>
              </div>

              <form onSubmit={onSubmit}>
                <div style={styles.field}>
                  <div style={styles.label}>카테고리</div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={styles.select}
                  >
                    <option value="선택">선택</option>
                    <option value="시설">시설</option>
                    <option value="비품">비품</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>요청 내용</div>
                  <input
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    style={styles.input}
                    placeholder={`예) PC ${selectedComputer?.computer_number ?? selectedComputerId} 모니터 깜빡임`}
                  />
                </div>

                <button type="submit" style={styles.submit}>
                  제출
                </button>
              </form>
            </div>

              <div style={styles.listTitle}>전체 요청 목록 ({repairLogs.length})</div>
            <div style={styles.bigBox}>

              {repairLogs.length === 0 ? (
                <div style={{ fontSize: 13, padding: 10, color: C.subtext }}>아직 요청 없음</div>
              ) : (
                repairLogs
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((r) => (
                    <div key={r.id} style={styles.item}>
                      <div style={styles.itemTop}>
                        <div style={styles.badgeRow}>
                          <span style={styles.badge("gray")}>PC {r.computer_id}</span>
                          <span style={styles.badge(categoryTone(r.category))}>{r.category}</span>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={styles.timeText}>{new Date(r.createdAt).toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => setRepairLogs((prev) => prev.filter((x) => x.id !== r.id))}
                            style={styles.smallBtn}
                            title="이 요청 삭제"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      <div style={styles.itemTitle}>{r.title}</div>
                    </div>
                  ))
              )}
            </div>

            <div style={styles.note}>
              * 좌측에서 PC 선택 후, 컴퓨터 정보 아래에서 요청을 작성하면 여기에 전부 모입니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}   