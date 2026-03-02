import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function D104() {
  // --- fetch helper ---
  const fetchApi = async (path, options = {}) => {
    const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const url = base ? `${base}${path}` : path;
    let opts = { ...options };
    if (!opts.headers) opts.headers = {};
    if (
      (opts.method === "POST" ||
        opts.method === "PATCH" ||
        opts.method === "PUT") &&
      opts.body &&
      typeof opts.body === "object"
    ) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, opts);
    if (!res.ok) {
      let msg = `API 오류: ${res.status} ${res.statusText}`;
      try {
        const data = await res.json();
        if (data?.message) msg += ` - ${data.message}`;
      } catch {}
      throw new Error(msg);
    }
    // Try to parse JSON, else return null
    try {
      const json = await res.json();
      // Common API shape: { success: true/false, data: ..., message: "..." }
      if (json && typeof json === "object" && "data" in json && "success" in json) {
        return json.data;
      }
      return json;
    } catch {
      return null;
    }
  };
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

  const [computers, setComputers] = useState([]);

  // --- Fetch computers and repair logs on mount ---
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await fetchApi(`/api/lab?location=${LOCATION}`);
        // robust shape handling
        let compArr = [];
        let reportsArr = [];
        if (Array.isArray(data)) {
          compArr = data;
          reportsArr = [];
        } else if (data?.computers) {
          compArr = data.computers;
          reportsArr = data.reports ?? [];
        } else if (data?.data?.computers) {
          compArr = data.data.computers;
          reportsArr = data.data.reports ?? [];
        }
        // Map by seat number (computer_number). DB `id` is global and must NOT be assumed to equal seat number.
        const compBySeat = {};
        for (const c of compArr) {
          const seat = c.computer_number;
          if (typeof seat === "number") compBySeat[seat] = c;
        }

        // Ensure all seats are present in UI (placeholders for missing ones)
        const allComps = allSeats.map((n) =>
          compBySeat[n]
            ? { ...compBySeat[n], location: LOCATION, computer_number: n }
            : {
                // Placeholder: no DB id yet
                id: null,
                location: LOCATION,
                computer_number: n,
                is_broken: false,
                manufacturer: "",
                model: "",
                serial_number: "",
              }
        );
        if (ignore) return;
        setComputers(allComps);
        setRepairLogs(
          Array.isArray(reportsArr)
            ? reportsArr.map((r) => ({
                ...r,
                createdAt: r.createdAt || r.created_at,
              }))
            : []
        );
      } catch (e) {
        // Optionally: error UI
        if (ignore) return;
        setComputers(
          allSeats.map((n) => ({
            id: null,
            location: LOCATION,
            computer_number: n,
            is_broken: false,
            manufacturer: "",
            model: "",
            serial_number: "",
          }))
        );
        setRepairLogs([]);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line
  }, [allSeats, LOCATION]);


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

    // Position to the right of the clicked seat, inside the room frame coordinate system
    let top = cellRect.top - roomRect.top;
    let left = cellRect.right - roomRect.left + 12;

    // Keep it within the room frame width if possible
    const POPOVER_W = 340;
    const POPOVER_PAD = 12;
    const maxLeft = roomRect.width - POPOVER_W - POPOVER_PAD;
    if (left > maxLeft) {
      // If no space on right, show on left
      left = Math.max(POPOVER_PAD, cellRect.left - roomRect.left - POPOVER_W - 12);
    }

    // Clamp vertically
    const maxTop = Math.max(POPOVER_PAD, roomRect.height - 260);
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
    () => computers.find((c) => c.computer_number === selectedSeatNumber) ?? computers[0],
    [computers, selectedSeatNumber]
  );

  const updateSelectedComputer = (patch) => {
    setComputers((prev) =>
      prev.map((c) =>
        c.computer_number === selectedSeatNumber ? { ...c, ...patch } : c
      )
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

  // --- Broken/hasOpenLogs logic by DB id (not seat number) ---
  const hasOpenLogs = (dbComputerId) => !!hasOpenLogMap[dbComputerId];

  const getComputerBySeat = (seatNumber) =>
    computers.find((c) => c.computer_number === seatNumber) || null;

  const isSeatBrokenOrHasLogs = (seatNumber) => {
    const c = getComputerBySeat(seatNumber);
    if (!c) return false;
    return !!c.is_broken || hasOpenLogs(c.id);
  };

  const [isEditingComputer, setIsEditingComputer] = useState(false);
  const [computerDraft, setComputerDraft] = useState({
    manufacturer: "",
    model: "",
    serial_number: "",
    is_broken: false,
  });

  // --- Fetch single computer + its reports when selection changes ---
  // --- Fetch single computer + its reports when selection changes ---
  useEffect(() => {
    let ignore = false;
    const dbId = selectedComputer?.id;
    if (!dbId) return;
    (async () => {
      try {
        const data = await fetchApi(`/api/lab/${dbId}`);
        // robust shape handling
        let comp = null;
        let reportsArr = [];
        if (data?.computer) {
          comp = { ...data.computer, id: dbId };
          reportsArr = data.reports ?? [];
        } else if (data?.data?.computer) {
          comp = { ...data.data.computer, id: dbId };
          reportsArr = data.data.reports ?? [];
        } else if (typeof data === "object" && data?.id != null) {
          comp = { ...data, id: dbId };
          reportsArr = data.reports ?? [];
        }
        // update computers by merging
        if (comp) {
          if (ignore) return;
          setComputers((prev) => {
            const found = prev.some((c) => c.id === dbId);
            if (!found) return prev;
            return prev.map((c) =>
              c.id === dbId
                ? { ...c, ...comp }
                : c
            );
          });
        }
        if (Array.isArray(reportsArr)) {
          if (ignore) return;
          // Remove old logs for this PC, add new ones
          setRepairLogs((prev) => {
            // Remove old logs for this computer
            const rest = prev.filter((r) => r.computer_id !== dbId);
            return [
              ...reportsArr.map((r) => ({
                ...r,
                createdAt: r.createdAt || r.created_at,
              })),
              ...rest,
            ];
          });
        }
      } catch (e) {
        // ignore error
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line
  }, [selectedComputer]);

  useEffect(() => {
    if (!selectedComputer) return;
    if (isEditingComputer) return;
    setComputerDraft({
      manufacturer: selectedComputer.manufacturer ?? "",
      model: selectedComputer.model ?? "",
      serial_number: selectedComputer.serial_number ?? "",
      is_broken: !!selectedComputer.is_broken,
    });
  }, [selectedSeatNumber, selectedComputer, isEditingComputer]);

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
    try {
      const patchBody = {
        manufacturer: computerDraft.manufacturer,
        model: computerDraft.model,
        serial_number: computerDraft.serial_number,
        is_broken: !!computerDraft.is_broken,
      };
      const dbId = selectedComputer?.id;
      if (!dbId) {
        alert("이 PC는 서버에 등록된 ID가 없어서 저장이 안 됩니다. (DB에 PC 레코드가 있어야 PATCH 가능)\n\n해결: 서버에 해당 PC(좌석 번호)를 먼저 등록하거나, 등록 API를 추가해야 합니다.");
        return;
      }
      await fetchApi(`/api/lab/${dbId}`, {
        method: "PATCH",
        body: patchBody,
      });
      updateSelectedComputer(patchBody);
      setIsEditingComputer(false);
    } catch (e) {
      console.error("PC 저장 실패:", e);
      alert(e?.message || "PC 저장에 실패했습니다. 콘솔을 확인해 주세요.");
    }
  };

  const [category, setCategory] = useState("선택");
  const [requestText, setRequestText] = useState("");

  const filtered = useMemo(
    () => {
      const dbId = selectedComputer?.id;
      if (!dbId) return [];
      return repairLogs.filter((r) => r.computer_id === dbId);
    },
    [repairLogs, selectedComputer]
  );

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

    try {
      const body = {
        category,
        title: requestText.trim(),
      };
      const dbId = selectedComputer?.id;
      if (!dbId) throw new Error("선택된 PC의 서버 ID가 없습니다.");
      const res = await fetchApi(`/api/lab/${dbId}/reports`, {
        method: "POST",
        body,
      });
      // Accept returned report or fallback
      let newReport = res;
      if (!newReport || typeof newReport !== "object" || newReport.id == null) {
        newReport = {
          id: Date.now(),
          computer_id: dbId,
          category,
          title: requestText.trim(),
          createdAt: new Date().toISOString(),
        };
      } else {
        newReport = {
          ...newReport,
          computer_id: dbId,
          createdAt: newReport.createdAt || newReport.created_at || new Date().toISOString(),
        };
      }
      setRepairLogs((prev) => [newReport, ...prev]);
      // 요청이 등록되면 자동으로 '고장' 상태로 전환 (배치도 빨강)
      updateSelectedComputer({ is_broken: true });
      if (isEditingComputer) {
        setComputerDraft((d) => ({ ...d, is_broken: true }));
      }
      setCategory("선택");
      setRequestText("");
    } catch (e) {
      console.error("요청 등록 실패:", e);
      alert(e?.message || "요청 등록에 실패했습니다. 콘솔을 확인해 주세요.");
    }
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
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: C.bg,
      padding: 16,
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
      flex: 1,
      minHeight: 0,
    },

    card: {
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      boxShadow: "0 4px 20px rgba(92,82,72,.07)",
      color: C.text,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minHeight: 0,
    },

    leftWrap: {
      padding: 18,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minHeight: 0,
    },

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
      position: "relative",
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: 16,
      flex: 1,
      overflow: "auto",
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

    formWrap: {
      padding: 18,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minHeight: 0,
    },

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
      flex: 1,
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

    popover: {
      position: "absolute",
      width: 340,
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


  const categoryTone = (c) =>
    c === "시설" ? "green" : c === "비품" ? "green" : "gray";

  const onDeleteReport = async (reportId, computerId) => {
    try {
      await fetchApi(`/api/lab/reports/${reportId}`, { method: "DELETE" });
      setRepairLogs((prev) => {
        const next = prev.filter((x) => x.id !== reportId);
        // If this computer has no more logs, set is_broken: false
        if (!next.some((r) => r.computer_id === computerId)) {
          setComputers((prevComps) =>
            prevComps.map((c) =>
              c.id === computerId ? { ...c, is_broken: false } : c
            )
          );
        }
        return next;
      });
    } catch (e) {
      // Optionally: error UI
    }
  };

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
                    <p style={styles.popoverTitle}>
                      PC {selectedComputer?.computer_number ?? selectedSeatNumber} 정보
                    </p>
                    <button type="button" onClick={closeSeatPopover} style={styles.popoverClose}>
                      닫기
                    </button>
                  </div>

                  <div style={styles.popoverBody}>
                    <div style={styles.row2}>
                      <div style={styles.field}>
                        <div style={styles.label}>위치</div>
                        <input value={selectedComputer?.location ?? ""} readOnly style={styles.input} />
                      </div>
                      <div style={styles.field}>
                        <div style={styles.label}>컴퓨터 번호</div>
                        <input
                          value={String(selectedComputer?.computer_number ?? selectedSeatNumber)}
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

                    <div style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, margin: 0, color: C.text }}>
                        요청 목록
                      </div>
                      <div style={{ fontSize: 11, color: C.subtext }}>
                        ({filtered.length})
                      </div>
                    </div>

                    <div style={{
                      maxHeight: 220,
                      overflow: "auto",
                      borderRadius: 12,
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      padding: 10,
                      boxSizing: "border-box",
                    }}>
                      {filtered.length === 0 ? (
                        <div style={{ fontSize: 13, padding: 8, color: C.subtext }}>아직 요청 없음</div>
                      ) : (
                        filtered.map((r) => (
                          <div key={r.id} style={{ ...styles.item, marginBottom: 8 }}>
                            <div style={styles.itemTop}>
                              <div style={styles.badgeRow}>
                                <span style={styles.badge(categoryTone(r.category))}>{r.category}</span>
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={styles.timeText}>{new Date(r.createdAt).toLocaleString()}</span>
                                <button
                                  type="button"
                                  onClick={() => onDeleteReport(r.id, selectedComputer?.id)}
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
              )}
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

                    const active = cell === selectedSeatNumber;
                    return (
                      <div
                        key={key}
                        style={styles.cellPc(active, isSeatBrokenOrHasLogs(cell))}
                        onClick={(e) => openSeatPopover(cell, e)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") openSeatPopover(cell, e);
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
                  선택 PC: {selectedComputer?.computer_number ?? selectedSeatNumber}
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
                    placeholder={`예) PC ${selectedComputer?.computer_number ?? selectedSeatNumber} 모니터 깜빡임`}
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
                            onClick={() => onDeleteReport(r.id, r.computer_id)}
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

            {/* (note removed as per instructions) */}
          </div>
        </div>
      </div>
    </div>
  );
}   
