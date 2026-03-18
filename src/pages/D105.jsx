import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function D105() {
  const MAIN_COLS = 10;
  const LOCATION = "D105";

  // ===== 좌석 배치(프론트 고정) =====
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

  const mainGrid = useMemo(() => {
    return rows.map((r) => {
      if (r.type !== "seats") return Array(MAIN_COLS).fill(null);
      return Array.from({ length: MAIN_COLS }, (_, i) => r.start + i);
    });
  }, [rows]);

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

  // ===== API helper =====
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

  async function apiFetch(path, options = {}) {
    const res = await fetch(apiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      const msg = json?.message || `요청에 실패했습니다. (HTTP ${res.status})`;
      throw new Error(msg);
    }

    return json;
  }

  // ===== 상태: 컴퓨터 목록 =====
  // seatNumber = 화면에 보이는 좌석 번호(= computer_number)
  // dbId = 서버 DB의 PK(id)
  const [computers, setComputers] = useState(() =>
    allSeats.map((n) => ({
      seatNumber: n,
      dbId: null,
      location: LOCATION,
      computer_number: n,
      is_broken: false,
      manufacturer: "",
      model: "",
      serial_number: "",
    }))
  );

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  async function refreshComputerList() {
    setIsLoadingList(true);
    setIsLoadingReports(true);
    try {
      const json = await apiFetch(`/api/lab?location=${encodeURIComponent(LOCATION)}`);
      const data = Array.isArray(json?.data) ? json.data : [];
      const byNumber = new Map();
      for (const c of data) byNumber.set(Number(c.computer_number), c);

      const nextComputers = allSeats.map((n) => {
        const hit = byNumber.get(n);
        return {
          seatNumber: n,
          dbId: hit?.id ?? null,
          location: hit?.location ?? LOCATION,
          computer_number: n,
          is_broken: !!hit?.is_broken,
          manufacturer: hit?.manufacturer ?? "",
          model: hit?.model ?? "",
          serial_number: hit?.serial_number ?? "",
        };
      });

      setComputers(nextComputers);

      // 처음 진입 시 전체 요청 목록도 바로 채우기
      const dbIds = nextComputers
        .map((c) => c?.dbId)
        .filter((id) => typeof id === "number" || typeof id === "string");

      if (dbIds.length > 0) {
        const detailResults = await Promise.allSettled(
          dbIds.map((id) => apiFetch(`/api/lab/${id}`))
        );

        const nextReportsByDbId = {};

        for (let i = 0; i < detailResults.length; i++) {
          const result = detailResults[i];
          const dbId = dbIds[i];
          if (result.status !== "fulfilled") continue;

          const detail = result.value;
          const rawReports =
            detail?.data?.reports ||
            detail?.data?.repair_requests ||
            detail?.data?.repairReports ||
            detail?.data?.repair_logs ||
            detail?.data?.requests ||
            detail?.reports ||
            [];

          nextReportsByDbId[dbId] = Array.isArray(rawReports)
            ? rawReports.map((r) => ({
                id: r?.id,
                computer_id: r?.computer_id,
                category: r?.category,
                title: r?.title,
                createdAt: r?.created_at || r?.createdAt || r?.created || r?.created_time,
              }))
            : [];
        }

        setReportsByDbId(nextReportsByDbId);
      } else {
        setReportsByDbId({});
      }
    } finally {
      setIsLoadingList(false);
      setIsLoadingReports(false);
    }
  }

  useEffect(() => {
    refreshComputerList().catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [LOCATION]);

  // ===== 선택 좌석 =====
  const [selectedSeatNumber, setSelectedSeatNumber] = useState(allSeats[0] ?? 1);

  // --- seat popover (말풍선) ---
  const roomRef = useRef(null);
  const popoverRef = useRef(null);
  const [popover, setPopover] = useState({ open: false, top: 0, left: 0 });

  const openSeatPopover = (seatNumber, evt) => {
    setSelectedSeatNumber(seatNumber);
    const roomEl = roomRef.current;
    const targetEl = evt?.currentTarget;
    if (!roomEl || !targetEl) {
      setPopover((p) => ({ ...p, open: true }));
      return;
    }

    const roomRect = roomEl.getBoundingClientRect();
    const cellRect = targetEl.getBoundingClientRect();

    // Place popover near the clicked seat (viewport coordinates)
    const POPOVER_W = 320;
    const POPOVER_PAD = 12;
    const EST_H = 320; // rough popover height for clamping

    let top = cellRect.top;
    let left = cellRect.right + 12;

    // If no space on the right, show on the left of the seat
    const maxLeft = window.innerWidth - POPOVER_W - POPOVER_PAD;
    if (left > maxLeft) {
      left = Math.max(POPOVER_PAD, cellRect.left - POPOVER_W - 12);
    }

    // Seats below the podium (45+) should prefer bottom-aligned popover (show upward)
    const maxTop = Math.max(POPOVER_PAD, window.innerHeight - EST_H - POPOVER_PAD);
    const preferBottom = seatNumber >= 45;

    if (preferBottom || top + EST_H + POPOVER_PAD > window.innerHeight) {
      // Move up so the bottom of the popover stays in view (roughly aligns to the clicked seat's bottom)
      top = cellRect.bottom - EST_H;
    }

    top = Math.min(Math.max(POPOVER_PAD, top), maxTop);

    setPopover({ open: true, top, left });
  };

  const closeSeatPopover = () => setPopover((p) => ({ ...p, open: false }));

  // Close when clicking outside
  useEffect(() => {
    if (!popover.open) return;
    const onDown = (e) => {
      const pop = popoverRef.current;
      if (pop && pop.contains(e.target)) return;
      closeSeatPopover();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [popover.open]);

  const selectedComputer = useMemo(
    () => computers.find((c) => c.seatNumber === selectedSeatNumber) ?? computers[0],
    [computers, selectedSeatNumber]
  );

  // ===== 요청(리포트) =====
  const [reportsByDbId, setReportsByDbId] = useState({});

  const normalizeReport = (r) => ({
    id: r?.id,
    computer_id: r?.computer_id,
    category: r?.category,
    title: r?.title,
    createdAt: r?.created_at || r?.createdAt || r?.created || r?.created_time,
  });

  async function refreshSelectedReports(dbId, signal) {
    if (!dbId) return;

    const json = await apiFetch(`/api/lab/${dbId}`, { signal });

    const rawReports =
      json?.data?.reports ||
      json?.data?.repair_requests ||
      json?.data?.repairReports ||
      json?.data?.repair_logs ||
      json?.data?.requests ||
      [];

    const reports = Array.isArray(rawReports) ? rawReports.map(normalizeReport) : [];

    setReportsByDbId((prev) => ({
      ...prev,
      [dbId]: reports,
    }));
  }

  useEffect(() => {
    const dbId = selectedComputer?.dbId;
    if (!dbId) return;

    const controller = new AbortController();
    refreshSelectedReports(dbId, controller.signal).catch((e) => {
      if (e?.name === "AbortError") return;
      console.error(e);
    });

    return () => controller.abort();
  }, [selectedComputer?.dbId]);

  const selectedReports = useMemo(() => {
    const dbId = selectedComputer?.dbId;
    if (!dbId) return [];
    return reportsByDbId[dbId] || [];
  }, [reportsByDbId, selectedComputer?.dbId]);

  const allReports = useMemo(() => Object.values(reportsByDbId).flat(), [reportsByDbId]);

  // 좌석을 “고장/요청있음”으로 빨갛게 표시
  const seatHasReqOrBroken = (seatNumber) => {
    const c = computers.find((x) => x.seatNumber === seatNumber);
    if (!c) return false;
    if (c.is_broken) return true;
    if (!c.dbId) return false;
    return (reportsByDbId[c.dbId]?.length || 0) > 0;
  };

  // ===== 컴퓨터 정보 편집 =====
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
  }, [selectedComputer?.seatNumber, selectedComputer, isEditingComputer]);

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

  const saveComputerDraft = async () => {
    const dbId = selectedComputer?.dbId;
    if (!dbId) {
      alert("해당 좌석은 서버에 등록된 컴퓨터가 아닙니다.");
      return;
    }

    try {
      await apiFetch(`/api/lab/${dbId}`, {
        method: "PATCH",
        body: JSON.stringify({
          manufacturer: computerDraft.manufacturer,
          model: computerDraft.model,
          serial_number: computerDraft.serial_number,
          is_broken: !!computerDraft.is_broken,
        }),
      });

      await refreshComputerList();
      await refreshSelectedReports(dbId);
      setIsEditingComputer(false);
    } catch (e) {
      alert(e?.message || "저장에 실패했습니다.");
    }
  };

  // ===== 요청 작성 =====
  const [category, setCategory] = useState("선택");
  const [requestText, setRequestText] = useState("");

  const onSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (category === "선택") {
      alert("카테고리를 선택해 주세요.");
      return;
    }

    if (!requestText.trim()) {
      alert("요청 내용을 입력해 주세요.");
      return;
    }

    const dbId = selectedComputer?.dbId;
    if (!dbId) {
      alert("해당 좌석은 서버에 등록된 컴퓨터가 아닙니다.");
      return;
    }

    try {
      await apiFetch(`/api/lab/${dbId}/reports`, {
        method: "POST",
        body: JSON.stringify({
          category,
          title: requestText.trim(),
        }),
      });

      setCategory("선택");
      setRequestText("");

      // 서버 스펙: 요청이 1개라도 생기면 is_broken이 true가 되도록 하려는 목적
      // (혹시 서버에서 자동 처리하지 않으면, UI는 목록 갱신으로 동기화)
      await refreshComputerList();
      await refreshSelectedReports(dbId);

      if (isEditingComputer) {
        setComputerDraft((d) => ({ ...d, is_broken: true }));
      }
    } catch (err) {
      alert(err?.message || "요청 등록에 실패했습니다.");
    }
  };

  const deleteReport = async (reportId) => {
    try {
      await apiFetch(`/api/lab/reports/${reportId}`, { method: "DELETE" });

      const dbId = selectedComputer?.dbId;
      await refreshComputerList();
      if (dbId) await refreshSelectedReports(dbId);
    } catch (e) {
      alert(e?.message || "삭제에 실패했습니다.");
    }
  };

  // 전체 목록에서 PC 표시를 좌석번호로 보이게
  const seatNumberByDbId = useMemo(() => {
    const m = new Map();
    for (const c of computers) {
      if (c.dbId) m.set(c.dbId, c.seatNumber);
    }
    return m;
  }, [computers]);

  const displayPcLabelFromReport = (r) => {
    const dbId = Number(r?.computer_id);
    const seat = seatNumberByDbId.get(dbId);
    return seat ? `PC ${seat}` : `PC ${r?.computer_id ?? "-"}`;
  };

  // ====== UI 스타일 ======
  const C = {
    bg: "#f5f0eb",
    card: "#fdfaf7",
    border: "#e2d9cf",
    borderMed: "#cdc3b8",
    text: "#2d2822",
    subtext: "#7a6e64",
    accent: "#5c5248",
    accentHover: "#3d342c",
    pcNormal: "#c8e6c4",
    pcNormalText: "#2a5c30",
    pcBroken: "#f0c4c4",
    pcBrokenText: "#7c2424",
    pcSelected: "#3d342c",
    podium: "#e8e2db",
    podiumText: "#5c5248",
    tagGreen: "#d4ebe0",
    tagGreenText: "#1e5c3a",
    tagSlate: "#e3ddd8",
    tagSlateText: "#4a3f35",
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: C.bg,
      padding: 14,
      boxSizing: "border-box",
      fontFamily: "inherit",
      color: C.text,
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px",
      borderRadius: 14,
      background: C.card,
      border: `1px solid ${C.border}`,
      boxShadow: "0 4px 20px rgba(92,82,72,.07)",
      marginBottom: 12,
    },
    brand: { display: "flex", alignItems: "center", gap: 12 },
    navRow: { display: "flex", gap: 8, marginBottom: 6 },
    navPill: {
      textDecoration: "none",
      padding: "4px 10px",
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
      padding: "4px 10px",
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
      fontSize: 15,
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
      padding: "7px 12px",
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
      gridTemplateColumns: "1fr 360px",
      gap: 12,
      alignItems: "start",
    },
    card: {
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      boxShadow: "0 4px 20px rgba(92,82,72,.07)",
      color: C.text,
    },
    leftWrap: { padding: 14 },
    leftHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 10,
    },
    leftHeaderTitle: { fontWeight: 700, color: C.text, fontSize: 14 },
    leftHeaderHint: { fontSize: 12, color: C.subtext },
    roomFrame: {
      position: "relative",
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 12,
      paddingTop: 28,
    },
    roomFlex: {
      display: "grid",
      gridTemplateColumns: "1fr 64px",
      gap: 8,
      alignItems: "start",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: `repeat(${MAIN_COLS}, 1fr)`,
      gap: 6,
    },
    sideWrap: {
      position: "relative",
      width: "64px",
      overflow: "visible",
    },
    cellEmpty: {
      height: 44,
      borderRadius: 12,
      border: `1px dashed ${C.border}`,
      background: "transparent",
      boxSizing: "border-box",
    },
    cellPodium: {
      height: 44,
      borderRadius: 12,
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
    cellPc: (active, isAlert) => ({
      height: 44,
      borderRadius: 12,
      border: active
        ? `2px solid ${C.accentHover}`
        : isAlert
        ? `1px solid #d49a9a`
        : `1px solid #8fbb8c`,
      background: active ? C.pcSelected : isAlert ? C.pcBroken : C.pcNormal,
      color: active ? "#fdfaf7" : isAlert ? C.pcBrokenText : C.pcNormalText,
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      fontWeight: 700,
      fontSize: 12,
      userSelect: "none",
      boxSizing: "border-box",
      transition: "background 0.15s, border-color 0.15s",
    }),
    cellPcSide: (active, isAlert) => ({
      position: "absolute",
      left: 0,
      right: 0,
      borderRadius: 12,
      border: active
        ? `2px solid ${C.accentHover}`
        : isAlert
        ? `1px solid #d49a9a`
        : `1px solid #8fbb8c`,
      background: active ? C.pcSelected : isAlert ? C.pcBroken : C.pcNormal,
      color: active ? "#fdfaf7" : isAlert ? C.pcBrokenText : C.pcNormalText,
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      fontWeight: 700,
      fontSize: 12,
      userSelect: "none",
      boxSizing: "border-box",
      transition: "background 0.15s, border-color 0.15s",
    }),
    formWrap: { padding: 14 },
    infoCard: {
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      background: C.card,
      padding: 12,
      marginBottom: 10,
    },
    infoHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 10,
      marginBottom: 12,
    },
    infoTitle: { fontSize: 13, fontWeight: 700, margin: 0, color: C.text },
    infoMeta: { fontSize: 11, color: C.subtext },
    formTitleRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 14,
      gap: 10,
    },
    formTitle: { fontSize: 14, fontWeight: 700, margin: 0, color: C.text },
    field: { display: "grid", gap: 6, marginBottom: 12 },
    label: {
      fontSize: 12,
      fontWeight: 700,
      color: C.subtext,
      letterSpacing: "0.2px",
    },
    input: {
      width: "100%",
      height: 36,
      padding: "0 12px",
      borderRadius: 10,
      border: `1px solid ${C.border}`,
      background: C.bg,
      color: C.text,
      outline: "none",
      boxSizing: "border-box",
      fontSize: 12,
    },
    select: {
      width: "100%",
      height: 36,
      padding: "0 12px",
      borderRadius: 10,
      border: `1px solid ${C.border}`,
      background: C.bg,
      color: C.text,
      outline: "none",
      boxSizing: "border-box",
      fontSize: 12,
    },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    submit: {
      width: "100%",
      height: 40,
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
    bigBox: {
      height: 210,
      borderRadius: 14,
      background: C.bg,
      border: `1px solid ${C.border}`,
      padding: 12,
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
        gray: { bg: C.tagSlate, fg: C.tagSlateText },
        green: { bg: C.tagGreen, fg: C.tagGreenText },
        red: { bg: C.pcBroken, fg: "#7c2d2d" },
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
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        lineHeight: 1,
        flexShrink: 0,
      };
    },
    itemTitle: {
      fontWeight: 700,
      margin: "8px 0 6px 0",
      color: C.text,
      fontSize: 13,
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

    popover: {
      position: "fixed",
      width: 320,
      borderRadius: 14,
      border: `1px solid ${C.borderMed}`,
      background: C.card,
      boxShadow: "0 10px 30px rgba(0,0,0,.12)",
      zIndex: 30,
      overflow: "hidden",
    },

    popoverHeader: {
      padding: "10px 12px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `1px solid ${C.border}`,
      background: C.bg,
    },

    popoverTitle: {
      margin: 0,
      fontSize: 13,
      fontWeight: 800,
      color: C.text,
    },

    popoverBody: {
      padding: 12,
    },

    popoverClose: {
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${C.border}`,
      background: C.card,
      color: C.subtext,
      fontSize: 12,
      fontWeight: 800,
      cursor: "pointer",
    },
  };

  const categoryTone = (c) => (c === "시설" ? "green" : c === "비품" ? "green" : "gray");

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <div>
            <div style={styles.navRow}>
              <Link to="/d104" style={styles.navPill}>
                D104
              </Link>
              <Link to="/d105" style={styles.navPillActive}>
                D105
              </Link>
            </div>
            <p style={styles.title}>실습실 PC 요청</p>
            <p style={styles.sub}>
              D105 (배치도) · PC 클릭 → 오른쪽에서 요청 작성
              {isLoadingList ? " · PC 목록 불러오는 중…" : ""}
              {!isLoadingList && isLoadingReports ? " · 요청 목록 불러오는 중…" : ""}
            </p>
          </div>
        </div>
        <Link to="/" style={styles.linkBtn}>
          홈으로
        </Link>
      </div>

      <div style={styles.layout}>
        {/* 좌측: 배치도 */}
        <div style={styles.card}>
          <div style={styles.leftWrap}>
            <div style={styles.leftHeader}>
              <div style={styles.leftHeaderTitle}>PC 배치도</div>
              <div style={styles.leftHeaderHint}>PC 클릭 → 오른쪽에서 작성</div>
            </div>

            <div style={styles.roomFrame} ref={roomRef}>
              {popover.open && (
                <div
                  ref={popoverRef}
                  style={{
                    ...styles.popover,
                    top: popover.top,
                    left: popover.left,
                  }}
                  role="dialog"
                  aria-label="컴퓨터 정보"
                >
                  <div style={styles.popoverHeader}>
                    <p style={styles.popoverTitle}>PC {selectedSeatNumber} 정보</p>
                    <button type="button" onClick={closeSeatPopover} style={styles.popoverClose}>
                      닫기
                    </button>
                  </div>

                  <div style={styles.popoverBody}>
                    <div style={styles.row2}>
                      <div style={styles.field}>
                        <div style={styles.label}>위치</div>
                        <input value={selectedComputer?.location ?? LOCATION} readOnly style={styles.input} />
                      </div>
                      <div style={styles.field}>
                        <div style={styles.label}>컴퓨터 번호</div>
                        <input value={String(selectedSeatNumber)} readOnly style={styles.input} />
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

                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                      {!isEditingComputer ? (
                        <button type="button" onClick={startEditComputer} style={styles.smallBtn}>
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
                          <button type="button" onClick={cancelEditComputer} style={styles.smallBtn}>
                            취소
                          </button>
                        </>
                      )}

                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => isEditingComputer && setComputerDraft((d) => ({ ...d, is_broken: false }))}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: computerDraft.is_broken ? `1px solid ${C.border}` : `1px solid ${C.accent}`,
                            background: computerDraft.is_broken ? C.bg : C.accent,
                            color: computerDraft.is_broken ? C.subtext : "#fdfaf7",
                            fontWeight: 800,
                            cursor: "pointer",
                            fontSize: 12,
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
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: computerDraft.is_broken ? `1px solid ${C.pcBrokenText}` : `1px solid ${C.border}`,
                            background: computerDraft.is_broken ? C.pcBrokenText : C.bg,
                            color: computerDraft.is_broken ? "#fdfaf7" : C.subtext,
                            fontWeight: 800,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                          aria-pressed={!!computerDraft.is_broken}
                          disabled={!isEditingComputer}
                        >
                          고장
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, margin: 0, color: C.text }}>요청 목록</div>
                      <div style={{ fontSize: 11, color: C.subtext }}>({selectedReports.length})</div>
                    </div>

                    <div
                      style={{
                        maxHeight: 220,
                        overflow: "auto",
                        borderRadius: 12,
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        padding: 10,
                        boxSizing: "border-box",
                      }}
                    >
                      {!selectedComputer?.dbId ? (
                        <div style={{ fontSize: 13, padding: 8, color: C.subtext }}>서버에 등록되지 않은 좌석입니다.</div>
                      ) : selectedReports.length === 0 ? (
                        <div style={{ fontSize: 13, padding: 8, color: C.subtext }}>요청이 없습니다.</div>
                      ) : (
                        selectedReports
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                          )
                          .map((r) => (
                            <div key={r.id} style={{ ...styles.item, marginBottom: 8 }}>
                              <div style={styles.itemTop}>
                                <div style={styles.badgeRow}>
                                  <span style={styles.badge(categoryTone(r.category))}>{r.category}</span>
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <span style={styles.timeText}>
                                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                                  </span>
                                  <button type="button" onClick={() => deleteReport(r.id)} style={styles.smallBtn}>
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
              )}
              <div style={styles.roomFlex}>
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
                      style={styles.cellPc(cell === selectedSeatNumber, seatHasReqOrBroken(cell))}
                      onClick={(e) => openSeatPopover(cell, e)}
                    >
                      {cell}
                    </div>
                  );
                    })
                  )}
                </div>

                {/* 오른쪽 세로열 */}
                {(() => {
                  const CELL_H = 44;
                  const GAP = 6;
                  const STEP = CELL_H + GAP;
                  const INTRA_GAP = 4;
                  const PAIR_EXTRA = 4;
                  const seatRowIdxs = rows.map((r, idx) => (r.type === "seats" ? idx : null)).filter((v) => v !== null);

                  const top21 = seatRowIdxs[1] * STEP;
                  const bottom76 = seatRowIdxs[6] * STEP + CELL_H;
                  const rawSideH = (bottom76 - top21 - 5 * INTRA_GAP - 3 * PAIR_EXTRA) / 6;
                  const SIDE_H = Math.max(24, rawSideH);
                  const baseTop = top21 - (SIDE_H + INTRA_GAP);

                  const pairs = Math.ceil(seatRowIdxs.length / 2);
                  const gapsCount = Math.max(0, seatRowIdxs.length - 1);
                  const pairGaps = Math.max(0, pairs - 1);
                  const wrapHeight =
                    seatRowIdxs.length * SIDE_H + gapsCount * INTRA_GAP + pairGaps * PAIR_EXTRA;

                  return (
                    <div style={{ ...styles.sideWrap, height: wrapHeight }}>
                      {seatRowIdxs.map((idx, seatPos) => {
                        const num = rows[idx].side;
                        const active = num === selectedSeatNumber;
                        const accGap = seatPos * INTRA_GAP + Math.floor(seatPos / 2) * PAIR_EXTRA;
                        const top = baseTop + seatPos * SIDE_H + accGap;
                        const height = SIDE_H;

                        return (
                          <div
                            key={`side-${num}`}
                            style={{ ...styles.cellPcSide(active, seatHasReqOrBroken(num)), top, height }}
                            onClick={(e) => openSeatPopover(num, e)}
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

          </div>
        </div>

        {/* 우측: 전체 요청 */}
        <div style={styles.card}>
          <div style={styles.formWrap}>
            <div style={styles.formTitleRow}>
              <p style={styles.formTitle}>전체 요청</p>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoHead}>
                <p style={styles.infoTitle}>요청 작성</p>
                <div style={styles.infoMeta}>선택 PC: {selectedSeatNumber} · 상태: {selectedComputer?.is_broken ? "고장" : "정상"}</div>
              </div>

              <form onSubmit={onSubmit}>
                <div style={styles.field}>
                  <div style={styles.label}>카테고리</div>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
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
                    placeholder={`예) PC ${selectedSeatNumber} 모니터 깜빡임`}
                  />
                </div>

                <button type="submit" style={styles.submit}>제출</button>
              </form>
            </div>

            <div style={styles.listTitle}>
              전체 요청 목록 ({allReports.length})
              {isLoadingReports ? " · 불러오는 중…" : ""}
            </div>
            <div style={styles.bigBox}>
              {allReports.length === 0 ? (
                <div style={{ fontSize: 13, padding: 10, color: C.subtext }}>요청이 없습니다.</div>
              ) : (
                allReports
                  .slice()
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                  .map((r) => (
                    <div key={`${r.computer_id ?? "x"}-${r.id}`} style={styles.item}>
                      <div style={styles.itemTop}>
                        <div style={styles.badgeRow}>
                          <span style={styles.badge("gray")}>{displayPcLabelFromReport(r)}</span>
                          <span style={styles.badge(categoryTone(r.category))}>{r.category}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={styles.timeText}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</span>
                          <button type="button" onClick={() => deleteReport(r.id)} style={styles.smallBtn}>
                            x
                          </button>
                        </div>
                      </div>
                      <div style={styles.itemTitle}>{r.title}</div>
                    </div>
                  ))
              )}
            </div>

            <div style={styles.note}>* 좌측에서 PC를 선택한 뒤 요청을 작성하면, 요청 목록과 배치도 상태가 함께 갱신됩니다.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
