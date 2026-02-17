import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * 실습실 PC 배치도 (전자교탁 왼쪽) + 클릭하면 우측 패널에 PC 정보/요청 표시
 * - 번호는 "위에서부터 1,2,3..." 순으로 자동 부여
 * - DB 스키마 느낌:
 *   - Lab_Computers: manufacturer/model/serial_number/notes/is_broken 등
 *   - Repair_Logs: 컴퓨터별 요청 로그
 */

export default function D105() {
  // ====== PC 배치(요구한 스샷 그대로) ======

  // ====== PC 배치(11/22/33/.../88은 오른쪽 세로열) ======
  // 메인 그리드: 가로 10칸(1~10, 12~21, ...)
  // 오른쪽 세로열: 11,22,33,44,55,66,77,88
  const MAIN_COLS = 10;

  // row 모델: 메인 10칸 + 오른쪽 세로칸 1개
  const rows = useMemo(
    () => [
      { type: "seats", start: 1, side: 11 },   
      { type: "seats", start: 12, side: 22 },  
      { type: "aisle" },
      { type: "seats", start: 23, side: 33 },  
      { type: "seats", start: 34, side: 44 },
      { type: "podium" },
      { type: "seats", start: 45, side: 55 },  
      { type: "seats", start: 56, side: 66 },
      { type: "aisle" },
      { type: "seats", start: 67, side: 77 },  
      { type: "seats", start: 78, side: 88 },
    ],
    []
  );
  // 메인 10열(각 seats row는 start~start+9)
  const mainGrid = useMemo(() => {
    return rows.map((r) => {
      if (r.type !== "seats") return Array(MAIN_COLS).fill(null);
      return Array.from({ length: MAIN_COLS }, (_, i) => r.start + i);
    });
  }, [rows]);


  // 좌석 번호 리스트(1~88)
  const allSeats = useMemo(() => {
    const out = [];
    for (const r of rows) {
      if (r.type === "seats") {
        for (let i = 0; i < MAIN_COLS; i++) out.push(r.start + i);
        out.push(r.side);
      }
    }
    return out.sort((a, b) => a - b);
  }, [rows]);

  // ====== Lab_Computers (데모) ======
  const LOCATION = "D105";

  // ✅ computers는 수정 가능해야 하니까 useState로 들고간다
  const [computers, setComputers] = useState(() =>
    allSeats.map((n) => ({
      id: n, // 데모: id = 자리번호로 씀
      location: LOCATION,
      computer_number: n,
      is_broken: false,
      manufacturer: "",
      model: "",
      serial_number: "",
      notes: "",
    }))
  );

  // 좌석 수가 바뀌면(거의 없음) 누락된 PC만 보강
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
          notes: "",
        }));
      return add.length ? [...prev, ...add].sort((a, b) => a.id - b.id) : prev;
    });
  }, [allSeats]);

  // 선택된 컴퓨터(= Lab_Computers.id)
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

  // ====== Repair_Logs (데모) ======
  const [repairLogs, setRepairLogs] = useState([

  ]);

  // PC별 '진행중(대기/수리중)' 로그가 하나라도 있으면 true
  const hasOpenLogMap = useMemo(() => {
    const map = {};
    for (const r of repairLogs) {
      map[r.computer_id] = true; // 요청 하나라도 있으면 빨강 대상
    }
    return map;
  }, [repairLogs]);

  const isBroken = (computerId) =>
    !!computers.find((c) => c.id === computerId)?.is_broken;

  const hasOpenLogs = (computerId) => !!hasOpenLogMap[computerId];

  // ====== 컴퓨터 정보 편집(일괄 저장) ======
  const [isEditingComputer, setIsEditingComputer] = useState(false);
  const [computerDraft, setComputerDraft] = useState({
    manufacturer: "",
    model: "",
    serial_number: "",
    notes: "",
    is_broken: false,
  });

  // 선택 PC가 바뀌거나 편집을 종료하면 draft를 현재 값으로 동기화
  useEffect(() => {
    if (!selectedComputer) return;
    if (isEditingComputer) return;
    setComputerDraft({
      manufacturer: selectedComputer.manufacturer ?? "",
      model: selectedComputer.model ?? "",
      serial_number: selectedComputer.serial_number ?? "",
      notes: selectedComputer.notes ?? "",
      is_broken: !!selectedComputer.is_broken,
    });
  }, [selectedComputerId, selectedComputer, isEditingComputer]);

  const startEditComputer = () => {
    if (!selectedComputer) return;
    setComputerDraft({
      manufacturer: selectedComputer.manufacturer ?? "",
      model: selectedComputer.model ?? "",
      serial_number: selectedComputer.serial_number ?? "",
      notes: selectedComputer.notes ?? "",
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
      notes: selectedComputer.notes ?? "",
      is_broken: !!selectedComputer.is_broken,
    });
    setIsEditingComputer(false);
  };

  const saveComputerDraft = () => {
    updateSelectedComputer({
      manufacturer: computerDraft.manufacturer,
      model: computerDraft.model,
      serial_number: computerDraft.serial_number,
      notes: computerDraft.notes,
      is_broken: !!computerDraft.is_broken,
    });
    setIsEditingComputer(false);
  };

  // ====== 우측 폼 ======
  const [category, setCategory] = useState("선택");
  const [requestText, setRequestText] = useState("");

  const filtered = useMemo(
    () => repairLogs.filter((r) => r.computer_id === selectedComputerId),
    [repairLogs, selectedComputerId]
  );

  const onSubmit = (e) => {
    e.preventDefault();

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
        description: "",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setCategory("선택");
    setRequestText("");
  };

  // ====== 스타일 (라이트 테마: 처음 버전 느낌) ======
  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f6f7fb",
      padding: 22,
      boxSizing: "border-box",
      fontFamily:
        "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple SD Gothic Neo, Noto Sans KR, sans-serif",
      color: "#111827",
    },

    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 16px",
      borderRadius: 14,
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      boxShadow: "0 10px 30px rgba(0,0,0,.06)",
      marginBottom: 16,
    },

    brand: { display: "flex", alignItems: "center", gap: 12 },

    logo: {
      width: 34,
      height: 34,
      borderRadius: 10,
      display: "grid",
      placeItems: "center",
      background: "#111827",
      color: "#fff",
      fontWeight: 900,
      flex: "0 0 auto",
    },

    title: {
      margin: 0,
      fontSize: 16,
      fontWeight: 900,
      color: "#111827",
      letterSpacing: "-0.2px",
    },

    sub: {
      margin: 0,
      marginTop: 2,
      fontSize: 12,
      color: "#6b7280",
    },

    navRow: { display: "flex", gap: 8, marginBottom: 6 },

    navPill: {
      textDecoration: "none",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#111827",
      fontWeight: 900,
      fontSize: 12,
    },

    navPillActive: {
      textDecoration: "none",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid #111827",
      background: "#111827",
      color: "#fff",
      fontWeight: 900,
      fontSize: 12,
    },

    linkBtn: {
      textDecoration: "none",
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid #111827",
      background: "#111827",
      color: "#fff",
      fontWeight: 900,
      fontSize: 12,
    },

    layout: {
      display: "grid",
      gridTemplateColumns: "1fr 380px",
      gap: 16,
      alignItems: "start",
    },

    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,.06)",
      color: "#111827",
    },

    leftWrap: { padding: 16 },

    leftHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 12,
    },

    leftHeaderTitle: { fontWeight: 900, color: "#111827" },

    leftHeaderHint: { fontSize: 12, opacity: 0.7, color: "#6b7280" },

    roomFrame: {
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        paddingTop: 34, // ✅ 위쪽 여백 추가해서 11번 세로칸이 프레임 밖으로 안 튀어나오게
      },
      
      // 메인 + 우측 세로열
      roomFlex: {
        display: "grid",
        gridTemplateColumns: "1fr 72px", // 세로 pill 여유
        gap: 10,
        alignItems: "start",
      },
      
      grid: {
        display: "grid",
        gridTemplateColumns: `repeat(${MAIN_COLS}, 1fr)`,
        gap: 10,
      },
      
      // 오른쪽 세로열 컨테이너 (absolute 배치용)
      sideWrap: {
        position: "relative",
        width: "72px",
        // ✅ 11~88 세로열은 '연속 스택'으로 쌓음(중간 통로/전자교탁 줄 간격 무시)
        height: 8 * 91, // SIDE_H(91) * 8개
        overflow: "visible",
      },
      
      // 오른쪽 세로 PC (길쭉한 pill)
      cellPcSide: (active, hasReq) => ({
        position: "absolute",
        left: 0,
        right: 0,
        borderRadius: 14,
        border: active ? "2px solid #111827" : "1px solid #e5e7eb",
        background: active ? "#111827" : hasReq ? "#fca5a5" : "#bbf7d0",
        color: active ? "#fff" : "#111827",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        userSelect: "none",
        boxSizing: "border-box",
      }),

    
    cellSpacer: {
      height: 54,
      borderRadius: 14,
      border: "1px solid transparent",
      background: "transparent",
    },
    cellEmpty: {
      height: 54,
      borderRadius: 14,
      border: "1px dashed #e5e7eb",
      background: "transparent",
      boxSizing: "border-box"
    },

    cellPodium: {
        height: 54,
        borderRadius: 14,
        border: "1px solid #cbd5e1",
        background: "#e2e8f0",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        color: "#334155",
        userSelect: "none",
        boxSizing: "border-box",
      },

    cellPc: (active, hasReq) => ({
        height: 54,
        borderRadius: 14,
        border: active ? "2px solid #111827" : "1px solid #e5e7eb",
        background: active ? "#111827" : hasReq ? "#fca5a5" : "#bbf7d0",
        color: active ? "#fff" : "#111827",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        userSelect: "none",
        boxSizing: "border-box",
      }),

    formWrap: { padding: 16 },

    infoCard: {
      borderRadius: 14,
      border: "1px solid #e5e7eb",
      background: "#fff",
      padding: 12,
      marginBottom: 12,
    },

    infoHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 10,
      marginBottom: 10,
    },

    infoTitle: { fontSize: 13, fontWeight: 900, margin: 0, color: "#111827" },

    infoMeta: { fontSize: 11, color: "#6b7280" },

    formTitleRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 12,
      gap: 10,
    },

    formTitle: { fontSize: 14, fontWeight: 900, margin: 0, color: "#111827" },

    pcPill: {
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#111827",
      fontSize: 12,
      fontWeight: 900,
    },

    field: { display: "grid", gap: 6, marginBottom: 12 },

    label: { fontSize: 12, fontWeight: 900, opacity: 0.9, color: "#374151" },

    input: {
      width: "100%",
      height: 40,
      padding: "0 12px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#111827",
      outline: "none",
      boxSizing: "border-box",
    },

    select: {
      width: "100%",
      height: 40,
      padding: "0 12px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#111827",
      outline: "none",
      boxSizing: "border-box",
    },

    textarea: {
      width: "100%",
      minHeight: 140,
      padding: 12,
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#111827",
      outline: "none",
      resize: "vertical",
      boxSizing: "border-box",
    },

    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },

    hint: { fontSize: 11, opacity: 0.7, marginTop: 2, color: "#6b7280" },

    submit: {
      width: "100%",
      height: 44,
      borderRadius: 12,
      border: "1px solid #111827",
      background: "#111827",
      color: "#fff",
      fontWeight: 900,
      cursor: "pointer",
    },

    listWrap: { marginTop: 14 },

    bigBox: {
      height: 280,
      borderRadius: 16,
      background: "#fff",
      border: "1px solid #e5e7eb",
      padding: 14,
      boxSizing: "border-box",
      overflow: "auto",
      color: "#111827",
    },

    listTitle: {
      fontSize: 13,
      fontWeight: 900,
      margin: "0 0 10px 0",
      color: "#111827",
    },

    item: {
      padding: 12,
      borderRadius: 14,
      border: "1px solid #e5e7eb",
      background: "#fff",
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
        gray: { bg: "#f3f4f6", fg: "#374151" },
        red: { bg: "#fee2e2", fg: "#991b1b" },
        green: { bg: "#dcfce7", fg: "#166534" },
        blue: { bg: "#dbeafe", fg: "#1e40af" },
      };
      const t = map[tone] ?? map.gray;
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 900,
        background: t.bg,
        color: t.fg,
      };
    },

    itemTitle: { fontWeight: 900, margin: "8px 0 6px 0", color: "#111827" },

    itemBody: {
      margin: 0,
      fontSize: 13,
      opacity: 0.9,
      lineHeight: 1.45,
      color: "#374151",
    },

    smallBtn: {
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#111827",
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      opacity: 0.85,
    },

    timeText: { fontSize: 12, opacity: 0.55, color: "#6b7280" },

    note: { fontSize: 11, opacity: 0.6, marginTop: 10, color: "#6b7280" },
  };

  const statusTone = (s) => (s === "완료" ? "green" : s === "수리중" ? "blue" : "gray");
  const categoryTone = (c) =>
    c === "시설" ? "green": c === "비품" ? "green" : "gray";
  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <div>
            <div style={styles.navRow}>
              <Link to="/d104" style={styles.navPill}>D104</Link>
              <Link to="/d105" style={styles.navPillActive}>D105</Link>
            </div>
            <p style={styles.title}>실습실 PC 요청</p>
            <p style={styles.sub}>D105 (배치도) · PC 클릭 → 오른쪽에서 요청 작성</p>
          </div>
        </div>
        <Link to="/" style={styles.linkBtn}>홈으로</Link>
      </div>

      <div style={styles.layout}>
        {/* 좌측: 배치도 */}
        <div style={styles.card}>
          <div style={styles.leftWrap}>
            <div style={styles.leftHeader}>
              <div style={styles.leftHeaderTitle}>PC 배치도</div>
              <div style={styles.leftHeaderHint}>PC 클릭 → 오른쪽에서 작성</div>
            </div>

            <div style={styles.roomFrame}>
            <div style={styles.roomFlex}>
                    {/* 메인 10열 그리드 */}
                    <div style={styles.grid}>
                        {mainGrid.flatMap((row, rIdx) =>
                            row.map((cell, cIdx) => {
                                const key = `m-${rIdx}-${cIdx}`;
                                const rowType = rows[rIdx]?.type;
                                if (rowType === "podium") {
                                    if (cIdx === 0) return <div key={key} style={styles.cellPodium}>전자교탁</div>;
                                    return <div key={key} style={styles.cellEmpty} />;
                                }
                                if (rowType === "aisle" || cell == null) return <div key={key} style={styles.cellEmpty} />;
                                
                                return (
                                    <div
                                        key={key}
                                        style={styles.cellPc(cell === selectedComputerId, hasOpenLogs(cell) || isBroken(cell))}
                                        onClick={() => setSelectedComputerId(cell)}
                                    >
                                        {cell}
                                    </div>
                                );
                            })
                        )}
                    </div>

                {/* 오른쪽 세로열 (11/22/33/.../88) - 스케치처럼 십자가(경계) 중심 정렬 */}
                    {/* 오른쪽 세로열 (11/22/33/.../88) - 연속 스택(틈 0) */}
                    {(() => {
                    const CELL_H = 54;
                    const GAP = 10;
                    const STEP = CELL_H + GAP; // 64
                    const INTRA_GAP = 4; // ✅ 11-22, 33-44, 55-66, 77-88 사이도 살짝 띄움
                    const PAIR_EXTRA = 4; // ✅ 22-33, 44-55, 66-77은 추가로 더 띄워서(총 8px)
                    const seatRowIdxs = rows
                        .map((r, idx) => (r.type === "seats" ? idx : null))
                        .filter((v) => v !== null);

                    // 방어: seats row 부족하면 기본값
                    const top21 = seatRowIdxs[1] * STEP;
                    const bottom76 = seatRowIdxs[6] * STEP + CELL_H;

                    // ✅ 22 top == 21 top, 77 bottom == 76 bottom 을 유지하면서
                    //    11-22/33-44/... (INTRA_GAP) + 22-33/44-55/... (PAIR_EXTRA 추가)까지 반영해 높이 계산
                    const rawSideH = (bottom76 - top21 - 5 * INTRA_GAP - 3 * PAIR_EXTRA) / 6;
                    const SIDE_H = Math.max(24, rawSideH); // 방어

                    // 22(top) = baseTop + 1*SIDE_H + 1*INTRA_GAP + 0*PAIR_EXTRA == top21
                    const baseTop = top21 - (SIDE_H + INTRA_GAP);

                    const pairs = Math.ceil(seatRowIdxs.length / 2);
                    const gapsCount = Math.max(0, seatRowIdxs.length - 1);
                    const pairGaps = Math.max(0, pairs - 1);
                    const wrapHeight = seatRowIdxs.length * SIDE_H + gapsCount * INTRA_GAP + pairGaps * PAIR_EXTRA;

                    return (
                        <div style={{ ...styles.sideWrap, height: wrapHeight }}>
                        {seatRowIdxs.map((idx, seatPos) => {
                            const num = rows[idx].side;
                            const active = num === selectedComputerId;

                            // 누적 간격: 모든 칸 사이 INTRA_GAP + 페어 사이 추가 PAIR_EXTRA
                            const accGap = seatPos * INTRA_GAP + Math.floor(seatPos / 2) * PAIR_EXTRA;
                            const top = baseTop + seatPos * SIDE_H + accGap;
                            const height = SIDE_H;

                            return (
                            <div
                                key={`side-${num}`}
                                style={{
                                ...styles.cellPcSide(active, hasOpenLogs(num) || isBroken(num)),
                                top,
                                height,
                                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55)",
                                }}
                                onClick={() => setSelectedComputerId(num)}
                                title={`PC ${num}`}
                            >
                                {num}
                            </div>
                            );
                        })}
                        </div>
                    );
                    })()}
              </div>
            </div>

            {/* ✅ 컴퓨터 정보 (Lab_Computers) */}
            <div style={{ marginTop: 14 }}>
              <div style={styles.infoCard}>
                <div style={styles.infoHead}>
                  <p style={styles.infoTitle}>컴퓨터 정보</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!isEditingComputer ? (
                      <button type="button" onClick={startEditComputer} style={styles.smallBtn}>
                        수정
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={saveComputerDraft} style={styles.smallBtn}>
                          저장
                        </button>
                        <button type="button" onClick={cancelEditComputer} style={styles.smallBtn}>
                          취소
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={styles.row2}>
                  <div style={styles.field}>
                    <div style={styles.label}>위치</div>
                    <input value={selectedComputer?.location ?? ""} readOnly style={styles.input} />
                  </div>
                  <div style={styles.field}>
                    <div style={styles.label}>컴퓨터 번호</div>
                    <input
                      value={String(selectedComputer?.computer_number ?? selectedComputerId)}
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
                      onChange={(e) => setComputerDraft((d) => ({ ...d, manufacturer: e.target.value }))}
                      style={styles.input}
                      disabled={!isEditingComputer}
                      placeholder="예) Dell / LG / Samsung"
                    />
                  </div>
                  <div style={styles.field}>
                    <div style={styles.label}>모델(머신타입)</div>
                    <input
                      value={computerDraft.model}
                      onChange={(e) => setComputerDraft((d) => ({ ...d, model: e.target.value }))}
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
                      onChange={(e) => setComputerDraft((d) => ({ ...d, serial_number: e.target.value }))}
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
                        onClick={() => isEditingComputer && setComputerDraft((d) => ({ ...d, is_broken: false }))}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 12,
                          border: computerDraft.is_broken ? "1px solid #e5e7eb" : "1px solid #111827",
                          background: computerDraft.is_broken ? "#fff" : "#111827",
                          color: computerDraft.is_broken ? "#111827" : "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                        aria-pressed={!computerDraft.is_broken}
                        disabled={!isEditingComputer}
                      >
                        정상
                      </button>
                      <button
                        type="button"
                        onClick={() => isEditingComputer && setComputerDraft((d) => ({ ...d, is_broken: true }))}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 12,
                          border: computerDraft.is_broken ? "1px solid #111827" : "1px solid #e5e7eb",
                          background: computerDraft.is_broken ? "#111827" : "#fff",
                          color: computerDraft.is_broken ? "#fff" : "#111827",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                        aria-pressed={!!computerDraft.is_broken}
                        disabled={!isEditingComputer}
                      >
                        고장
                      </button>
                    </div>
                  </div>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>비고</div>
                  <textarea
                    value={computerDraft.notes}
                    onChange={(e) => setComputerDraft((d) => ({ ...d, notes: e.target.value }))}
                    style={styles.textarea}
                    disabled={!isEditingComputer}
                    placeholder="예) SSD 교체(2025-11) / 윈도우 재설치 필요 등"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 작성 패널 */}
        <div style={styles.card}>
          <div style={styles.formWrap}>
            <div style={styles.formTitleRow}>
              <p style={styles.formTitle}>요청 작성</p>
              <div style={styles.pcPill}>
                선택 PC: {selectedComputer?.computer_number ?? selectedComputerId} · 상태:{" "}
                {selectedComputer?.is_broken ? "고장" : "정상"}
              </div>
            </div>


            <form onSubmit={onSubmit}>
              <div style={styles.row2}>
                <div style={styles.field}>
                  <div style={styles.label}>카테고리</div>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
                    <option value="선택">선택</option>
                    <option value="시설">시설</option>
                    <option value="비품">비품</option>
                    <option value="기타">기타</option>
                  </select>
                  <div style={styles.hint}></div>
                </div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>요청 내용</div>
                <input
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  style={styles.input}
                  placeholder={`예) PC ${selectedComputer?.computer_number ?? selectedComputerId} 모니터 깜빡임`}
                />
                <div style={styles.hint}></div>
              </div>

              <button type="submit" style={styles.submit}>
                제출
              </button>

              <div style={styles.listWrap}>
                <div style={styles.bigBox}>
                  <div style={styles.listTitle}>
                    요청 목록 (PC {selectedComputer?.computer_number ?? selectedComputerId}) ({filtered.length})
                  </div>

                  {filtered.length === 0 ? (
                    <div style={{ fontSize: 13, padding: 10, color: "#6b7280" }}>
              
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
                        {r.description ? <p style={styles.itemBody}>{r.description}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

}