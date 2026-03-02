import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./AdminPage.module.css";

export default function AdminPage() {
  const ENV_API_BASE = import.meta.env.VITE_API_BASE_URL || ""; // 예: http://localhost:3000 또는 https://xxx.supabase.co/functions/v1
  const [apiBase, setApiBase] = useState(ENV_API_BASE);
  const effectiveBase = (apiBase || "").replace(/\/+$/, "");

  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");
                 
  // ====== 개강/종강 입력(주차 생성) 폼 ======
  const [semesterStart, setSemesterStart] = useState(""); // YYYY-MM-DD
  const [semesterEnd, setSemesterEnd] = useState(""); // 종강일(선택) YYYY-MM-DD
  const [weekCount, setWeekCount] = useState(16);

  // ====== 학회원 추가 폼 ======
  const [newUser, setNewUser] = useState({
    name: "",
  });

  // ====== 학회원 삭제 폼 ======
  const [deleteUserName, setDeleteUserName] = useState("");

  // ====== 학회원 목록 ======
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ====== 학회원 컬러 풀(프론트에서만 사용, UI에는 표시하지 않음) ======
  const USER_COLOR_POOL = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#84cc16", // lime
    "#22c55e", // green
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#a855f7", // purple
    "#ec4899", // pink
  ];

  const pickUserColor = (currentUsers) => {
    const used = new Set(
      (currentUsers || [])
        .map((u) => u.color ?? u.user_color ?? u.userColor)
        .filter(Boolean)
    );

    // 1) 안 쓰는 컬러가 있으면 그 중 첫 번째
    const available = USER_COLOR_POOL.find((c) => !used.has(c));
    if (available) return available;

    // 2) 다 찼으면 그냥 순환(중복 허용)
    const idx = (currentUsers?.length ?? 0) % USER_COLOR_POOL.length;
    return USER_COLOR_POOL[idx];
  };
  // ====== 유저 로그(학회원별) ======
  const [selectedLogUserId, setSelectedLogUserId] = useState("");
  const [selectedLogDate, setSelectedLogDate] = useState(""); // YYYY-MM-DD
  const [userLogs, setUserLogs] = useState("");
  const [userLogsLoading, setUserLogsLoading] = useState(false);

  const pretty = (obj) => {
    try {
      return typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const normalizeUsers = (payload) => {
    if (!payload) return [];

    // already an array
    if (Array.isArray(payload)) return payload;

    // common wrappers
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.users)) return payload.users;
    if (payload.data && Array.isArray(payload.data.users)) return payload.data.users;

    // extra common shapes
    if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
    if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.result)) return payload.result;

    return [];
  };

  const normalizeOneUser = (payload) => {
    if (!payload) return null;
    // sometimes POST returns the created row directly
    if (payload.id || payload.user_id || payload.admin_id || payload.uuid) return payload;

    // sometimes it returns { data: {...} } / { user: {...} }
    if (payload.data && (payload.data.id || payload.data.user_id || payload.data.admin_id || payload.data.uuid)) {
      return payload.data;
    }
    if (payload.user && (payload.user.id || payload.user.user_id || payload.user.admin_id || payload.user.uuid)) {
      return payload.user;
    }

    // sometimes it returns { data: [ ... ] }
    const arr = normalizeUsers(payload);
    if (arr.length > 0) return arr[0];

    return null;
  };

  const request = async (method, path, body) => {
    setBusy(true);
    setLog((prev) => prev + `\n\n▶ ${method} ${effectiveBase || "(same-origin)"}${path}`);

    try {
      const res = await fetch(`${effectiveBase}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await res.text();
      let data = text;
      try {
        data = text ? JSON.parse(text) : "";
      } catch {
        // keep raw text
      }

      setLog((prev) =>
        prev +
        `\nStatus: ${res.status} ${res.statusText}` +
        `\nResponse:\n${pretty(data)}`
      );

      if (!res.ok) {
        alert(`요청에 실패했습니다. (HTTP ${res.status}) 로그를 확인해 주세요.`);
      } else {
        alert("요청이 완료되었습니다. 로그를 확인해 주세요.");
      }

      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      setLog((prev) => prev + `\n❌ Error: ${String(e)}`);
      alert("요청 처리 중 오류가 발생했습니다. 로그를 확인해 주세요.");
      return { ok: false, status: 0, data: null };
    } finally {
      setBusy(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setLog((prev) => prev + `\n\n▶ GET ${effectiveBase || "(same-origin)"}/api/admin/users`);

    try {
      const res = await fetch(`${effectiveBase}/api/admin/users`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const text = await res.text();
      let data = text;
      try {
        data = text ? JSON.parse(text) : "";
      } catch {
        // keep raw
      }

      setLog((prev) =>
        prev +
        `\nStatus: ${res.status} ${res.statusText}` +
        `\nResponse:\n${pretty(data)}`
      );

      if (!res.ok) {
        alert(`학회원 목록을 불러오지 못했습니다. (HTTP ${res.status}) 로그를 확인해 주세요.`);
        setUsers([]);
        return;
      }

      setUsers(normalizeUsers(data));
    } catch (e) {
      setLog((prev) => prev + `\n❌ Error: ${String(e)}`);
      alert("학회원 목록을 불러오는 중 오류가 발생했습니다. 로그를 확인해 주세요.");
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };
  const loadUserLogs = async (opts = {}) => {
    const uid = String(opts.userId ?? selectedLogUserId ?? "").trim();
    const date = String(opts.date ?? selectedLogDate ?? "").trim();
  
    if (!uid) {
      setUserLogs("");
      return;
    }
  
    setUserLogsLoading(true);
    setLog((prev) =>
      prev +
      `\n\n▶ GET ${effectiveBase || "(same-origin)"}/api/admin/users/${uid}/logs${
        date ? `?date=${date}` : ""
      }`
    );
  
    try {
      const qs = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(
        `${effectiveBase}/api/admin/users/${encodeURIComponent(uid)}/logs${qs}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
  
      const text = await res.text();
      let data = text;
      try {
        data = text ? JSON.parse(text) : "";
      } catch {
        // keep raw
      }
  
      setLog((prev) => prev + `\nStatus: ${res.status} ${res.statusText}\nResponse:\n${pretty(data)}`);
  
      if (!res.ok) {
        setUserLogs("");
        return;
      }
  
      setUserLogs(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    } catch (e) {
      setLog((prev) => prev + `\n❌ Error: ${String(e)}`);
      setUserLogs("");
    } finally {
      setUserLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedLogUserId) {
      setUserLogs("");
      return;
    }
    loadUserLogs();
  }, [selectedLogUserId, selectedLogDate]);

  useEffect(() => {
    loadUsers();
  }, []);

  const resetSchedule = async () => {
    if (!confirm("학기 시간표를 초기화하시겠습니까? (late_count 초기화 포함)")) return;
    await request("POST", "/api/admin/schedules/init");
  };

  const setupWeeks = async (e) => {
    e.preventDefault();

    if (!semesterStart) {
      alert("개강일을 입력해 주세요.");
      return;
    }

    const payload = {
      semester_start_date: semesterStart,
      semester_end_date: semesterEnd || null,
      weeks: Number(weekCount) || 16,
    };

    await request("POST", "/api/admin/setup-weeks", payload);
  };

  const createUser = async (e) => {
    e.preventDefault();

    if (!newUser.name.trim()) {
      alert("이름을 입력해 주세요.");
      return;
    }

    const autoColor = pickUserColor(users);

    const result = await request("POST", "/api/admin/users", {
      name: newUser.name.trim(),
      color: autoColor,
    });
    
    setNewUser({ name: "" });

    if (result?.ok) {
      const created = normalizeOneUser(result.data);
      if (created) {
        setUsers((prev) => {
          const next = [{ ...created, color: created.color ?? autoColor }, ...prev];
          // id 기준 중복 제거 (없으면 그대로)
          const seen = new Set();
          return next.filter((u) => {
            const key = u.id ?? u.user_id ?? u.admin_id ?? u.uuid;
            if (key == null) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      } else {
        setUsers((prev) => [{ id: `tmp-${Date.now()}`, name: newUser.name.trim(), color: autoColor }, ...prev]);
        loadUsers();
      }
    }
  };

  const removeUser = async (e) => {
    e.preventDefault();

    const name = deleteUserName.trim();
    if (!name) {
      alert("삭제할 이름을 입력해 주세요.");
      return;
    }

    // 이름으로 users에서 찾기 (대소문자 무시, 완전일치 우선)
    const lowered = name.toLowerCase();
    const matches = (users || []).filter((u) => {
      const uName = String(u.name ?? u.username ?? "").trim();
      return uName && uName.toLowerCase() === lowered;
    });

    if (matches.length === 0) {
      alert(`해당 이름의 학회원을 찾을 수 없습니다: ${name}`);
      return;
    }

    if (matches.length > 1) {
      const ids = matches
        .map((u) => u.id ?? u.user_id ?? u.admin_id ?? u.uuid)
        .filter((v) => v != null)
        .join(", ");
      alert(`이름이 중복됩니다: ${name}\n해당 ID 목록: ${ids}\n목록의 삭제 버튼을 사용해 원하는 항목을 삭제해 주세요.`);
      return;
    }

    const target = matches[0];
    const id = target.id ?? target.user_id ?? target.admin_id ?? target.uuid;

    if (id == null || id === "") {
      alert("삭제할 ID를 확인할 수 없습니다. API 응답 필드를 확인해 주세요.");
      return;
    }

    if (!confirm(`학회원 '${name}'(ID: ${id})을(를) 삭제하시겠습니까?`)) return;
    const result = await request("DELETE", `/api/admin/users/${encodeURIComponent(id)}`);
    if (result?.ok) {
      setDeleteUserName("");
      loadUsers();
    }
  };

  const disabled = useMemo(() => busy, [busy]);

  const secondaryBtnStyle = {
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
  };

  const userListStyle = {
    marginTop: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: 10,
    background: "rgba(255,255,255,0.7)",
    maxHeight: 520,
    overflow: "auto",
  };

  const userRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#fff",
    marginBottom: 10,
  };

  const smallDangerBtnStyle = {
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.08)",
    color: "#991b1b",
    borderRadius: 999,
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
    flex: "0 0 auto",
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.title}>관리자 페이지</div>
          <div className={styles.sub}>학기 세팅 · 학회원 관리 · 리셋</div>
          <Link className={styles.linkBtn} to="/">
            홈으로
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        {/* 1) 학기 시간표 리셋 */}
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>학기 시간표 리셋</h3>
          <p className={styles.cardDesc}>
            <br />
            시간표를 초기화하며, 설정에 따라 Admin_Users의 late_count도 0으로 초기화됩니다.
          </p>

          <button className={styles.dangerBtn} onClick={resetSchedule} disabled={disabled}>
            {busy ? "처리중..." : "리셋 실행"}
          </button>
        </section>
 
        {/* 2) 개강일 입력(주차 생성) */}
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>개강일 입력 (주차 생성)</h3>
          <p className={styles.cardDesc}>
          </p>                   

          <form onSubmit={setupWeeks} className={styles.form}>
            <label className={styles.label}>
              개강일 (YYYY-MM-DD)
              <input
                className={styles.input}
                type="date"
                value={semesterStart}
                onChange={(e) => setSemesterStart(e.target.value)}
                disabled={disabled}
              />
            </label>

            <label className={styles.label}>
              종강일 (선택)
              <input
                className={styles.input}
                type="date"
                value={semesterEnd}
                onChange={(e) => setSemesterEnd(e.target.value)}
                disabled={disabled}
              />
            </label>

            <label className={styles.label}>
              총 주차 수
              <input
                className={styles.input}
                type="number"
                min={1}
                max={30}
                value={weekCount}
                onChange={(e) => setWeekCount(e.target.value)}
                disabled={disabled}
              />
            </label>

            <button className={styles.primaryBtn} type="submit" disabled={disabled}>
              {busy ? "처리중..." : "주차 생성/갱신"}
            </button>
          </form>
        </section>

        {/* 3) 학회원 추가 */}
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>학회원 추가</h3>
          <p className={styles.cardDesc}>
          </p>

          <form onSubmit={createUser} className={styles.form}>
            <label className={styles.label}>
              이름
              <input
                className={styles.input}
                value={newUser.name}
                onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                placeholder="예) 김준일"
                disabled={disabled}
              />
            </label>

            <button className={styles.primaryBtn} type="submit" disabled={disabled}>
              {busy ? "처리중..." : "추가"}
            </button>
          </form>
        </section>

        {/* 4) 학회원 삭제 */}
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>학회원 삭제</h3>
          <p className={styles.cardDesc}>
          </p>

          <form onSubmit={removeUser} className={styles.form}>
            <label className={styles.label}>
              이름
              <input
                className={styles.input}
                value={deleteUserName}
                onChange={(e) => setDeleteUserName(e.target.value)}
                placeholder="예) 유재중"
                disabled={disabled}
              />
            </label>

            <button className={styles.dangerBtn} type="submit" disabled={disabled}>
              {busy ? "처리중..." : "삭제"}
            </button>
          </form>
        </section>

        {/* 5) 학회원 목록 (오른쪽) */}
        <section className={styles.card} style={{ gridColumn: "1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h3 className={styles.cardTitle} style={{ marginBottom: 6 }}>
                학회원 목록
              </h3>
              <p className={styles.cardDesc} style={{ marginBottom: 0 }}>
              </p>
            </div>

            <button
              style={secondaryBtnStyle}
              type="button"
              onClick={loadUsers}
              disabled={usersLoading || disabled}
              title="학회원 목록 새로고침"
            >
              {usersLoading ? "불러오는중..." : "새로고침"}
            </button>
          </div>

          <div style={userListStyle}>
                {users.length === 0 ? (
                  <div style={{ padding: 10, color: "rgba(17,24,39,0.6)", fontSize: 13 }}>
                    {usersLoading ? "불러오는 중..." : "표시할 학회원이 없습니다. (또는 API 응답 파싱에 실패했습니다.)"}
                  </div>
                ) : (
                  users.map((u, idx) => {
                    const id = u.id ?? u.user_id ?? u.admin_id ?? u.uuid ?? idx;
                    const name = u.name ?? u.username ?? "(이름없음)";

                    return (
                      <div
                        key={String(id)}
                        style={{ ...userRowStyle, cursor: "pointer" }}
                        onClick={() => {
                          setSelectedLogUserId(String(id));
                        }}
                        title="클릭하면 유저 로그에서 해당 학회원이 선택됩니다."
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900, color: "#111827", lineHeight: 1.2 }}>
                            {name}
                          </div>
                          <div
                            style={{  
                              marginTop: 4,
                              fontSize: 20,
                              color: "rgba(17,24,39,0.6)",
                              wordBreak: "break-word",
                            }}
                          >
                            {`id: ${String(id)}`}
                          </div>
                        </div>  

                        <button
                          style={smallDangerBtnStyle}
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`'${name}'(ID: ${id})을(를) 삭제하시겠습니까?`)) return;
                            const result = await request(
                              "DELETE",
                              `/api/admin/users/${encodeURIComponent(id)}`
                            );
                            if (result?.ok) loadUsers();
                          }}
                          disabled={disabled}
                          title="이 학회원 삭제"
                        >
                          삭제
                        </button>
                      </div>
                    );
                  })
                )}
          </div>
        </section>

                {/* 유저 로그 */}
        <section className={styles.card} style={{ gridColumn: "2", gridRow: "1 / span 6" }}>
          <h3 className={styles.cardTitle}>유저 로그</h3>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={selectedLogUserId}
              onChange={(e) => setSelectedLogUserId(e.target.value)}
              disabled={disabled || usersLoading}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                fontWeight: 800,
                minWidth: 240,
                flex: "1 1 240px",
                maxWidth: 420,
              }}
            >
              <option value="">학회원 선택</option>
              {users.map((u, idx) => {
                const id = u.id ?? u.user_id ?? u.admin_id ?? u.uuid ?? idx;
                const name = u.name ?? u.username ?? `user ${String(id)}`;
                return (
                  <option key={String(id)} value={String(id)}>
                    {name} (id:{String(id)})
                  </option>
                );
              })}
            </select>

            <input
              type="date"
              value={selectedLogDate}
              onChange={(e) => setSelectedLogDate(e.target.value)}
              disabled={disabled}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                fontWeight: 800,
                minWidth: 200,
                flex: "0 0 auto",
              }}
            />

            <button
              className={styles.primaryBtn}
              type="button"
              onClick={() => loadUserLogs()}
              disabled={disabled || userLogsLoading || !selectedLogUserId}
              style={{ width: "auto" }}
              title="수동 새로고침"
            >
              {userLogsLoading ? "불러오는중..." : "로그 불러오기"}
            </button>

            <button
              type="button"
              onClick={() => {
                setUserLogs("");
                setSelectedLogDate("");
                setSelectedLogUserId("");
              }}
              disabled={disabled}
              style={secondaryBtnStyle}
              title="선택/로그 초기화"
            >
              초기화
            </button>
          </div>

          <textarea
            className={styles.log}
            value={userLogs}
            readOnly
            placeholder="학회원을 선택하면 로그가 자동으로 표시됩니다. 날짜를 선택하면 필터링됩니다."
            style={{ width: "100%", height: 420, maxHeight: 420, overflow: "auto", resize: "none" }}
          />

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 900, color: "rgba(17,24,39,0.75)" }}>
              API 디버그 로그 (관리자 확인용)
            </summary>
            <textarea
              className={styles.log}
              value={log}
              onChange={(e) => setLog(e.target.value)}
              style={{ minHeight: 220, marginTop: 10 }}
            />  
          </details> 
        </section>
      </div>
    </div>  
  ); 
}
