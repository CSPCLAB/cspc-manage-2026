import { useEffect, useMemo, useRef, useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./MeetingPanel.module.css";

async function fetchJson(url, { signal, ...options } = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `JSON이 아닌 응답이에요.\n요청: ${url}\nstatus: ${res.status}\ncontent-type: ${contentType}\n앞부분: ${text.slice(
        0,
        120
      )}`
    );
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `요청 실패 (${res.status})`);
  if (json?.success === false) throw new Error(json?.message ?? "요청 실패");
  return json;
}

export default function MeetingPanel() {
  const [tab, setTab] = useState("agenda");

  const [agendaItems, setAgendaItems] = useState([]);
  const [suggestItems, setSuggestItems] = useState([]);

  const [fetchingTab, setFetchingTab] = useState(null); // ✅ 목록 fetch 전용
  const [mutating, setMutating] = useState(false);       // ✅ 등록/삭제 전용
  const [error, setError] = useState("");
  const [text, setText] = useState("");

  const abortRef = useRef(null);

  const endpoints = useMemo(() => {
    if (tab === "agenda") {
      return {
        label: "회의안건",
        list: "/api/agendas",
        create: "/api/agendas",
        remove: (id) => `/api/agendas/${id}`,
        placeholder: "회의 안건을 한 줄로 추가",
      };
    }
    return {
      label: "건의사항",
      list: "/api/suggestions",
      create: "/api/suggestions",
      remove: (id) => `/api/suggestions/${id}`,
      placeholder: "건의 내용을 한 줄로 추가",
    };
  }, [tab]);

  const items = tab === "agenda" ? agendaItems : suggestItems;

  const setTabItems = (tabKey, list) => {
    const normalized = (Array.isArray(list) ? list : [])
      .filter((x) => x && x.id != null)
      .map((x) => ({ ...x, id: Number(x.id) }));

    if (tabKey === "agenda") setAgendaItems(normalized);
    else setSuggestItems(normalized);
  };

  const isFetchingThisTab = fetchingTab === tab; // ✅ "불러오는 중…" 표시 조건

  const refetch = async (tabKey = tab, { silent = false } = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!silent) setFetchingTab(tabKey); // ✅ silent면 로딩문구 안 띄움
    setError("");

    try {
      const url = tabKey === "agenda" ? "/api/agendas" : "/api/suggestions";
      const json = await fetchJson(url, { method: "GET", signal: controller.signal });
      setTabItems(tabKey, json?.data);
    } catch (e) {
      if (e?.name !== "AbortError") setError(e?.message ?? "목록을 불러오지 못했어요.");
    } finally {
      if (!silent) {
        setFetchingTab((cur) => (cur === tabKey ? null : cur));
      }
    }
  };

  useEffect(() => {
    const cacheEmpty = tab === "agenda" ? agendaItems.length === 0 : suggestItems.length === 0;
    if (cacheEmpty) refetch(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const onAdd = async () => {
    const content = text.trim();
    if (!content || mutating) return;

    setMutating(true);
    setError("");
    try {
      await fetchJson(endpoints.create, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setText("");
      await refetch(tab); // ✅ 목록 최신화는 하되, 로딩 문구는 fetch일 때만 뜸
    } catch (e) {
      setError(e?.message ?? "등록에 실패했어요.");
    } finally {
      setMutating(false);
    }
  };

  const onDelete = async (id) => {
    if (mutating) return;

    const target = items.find((x) => x.id === id);
    const preview = target?.content ?? "(내용을 찾을 수 없음)";
    const ok = window.confirm(`이 ${endpoints.label}을(를) 삭제할까요?\n\n- ${preview}`);
    if (!ok) return;

    setMutating(true);
    setError("");
    try {
      await fetchJson(endpoints.remove(id), { method: "DELETE" });
      await refetch(tab);
    } catch (e) {
      setError(e?.message ?? "삭제에 실패했어요.");
    } finally {
      setMutating(false);
    }
  };

  return (
    <Panel
      title="회의/건의"
      right={
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${tab === "agenda" ? styles.active : ""}`}
            onClick={() => setTab("agenda")}
          >
            회의안건
          </button>
          <button
            className={`${styles.tabBtn} ${tab === "suggest" ? styles.active : ""}`}
            onClick={() => setTab("suggest")}
          >
            건의사항
          </button>
        </div>
      }
    >
      <div className={styles.bodyWrap}>
        <div className={styles.scrollArea}>
          {error && <div className={styles.errorMsg}>{error}</div>}

          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <span>{item.content}</span>
                <button
                  className={styles.deleteBtn}
                  onClick={() => onDelete(item.id)}
                  disabled={mutating}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {!isFetchingThisTab && items.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                {tab === "agenda" ? "📝" : "💬"}
              </div>
              <div>
                <div className={styles.emptyTitle}>
                  {tab === "agenda" ? "회의 안건이 아직 없어요" : "건의사항이 아직 없어요"}
                </div>
                <div className={styles.emptyDesc}>
                  {tab === "agenda"
                    ? "논의할 주제를 아래에서 추가해보세요."
                    : "개선 아이디어를 아래에서 자유롭게 남겨주세요."}
                </div>
              </div>
            </div>
          )}

          {isFetchingThisTab && !mutating && (
            <div className={styles.loadingMsg}>불러오는 중…</div>
          )}
        </div>

        <div className={styles.editor}>
          <div className={styles.editorRow}>
            <input
              className={styles.input}
              placeholder={endpoints.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !mutating) onAdd();
              }}
              disabled={mutating}
            />
            <button className={styles.addBtn} onClick={onAdd} disabled={mutating}>
              {mutating ? "처리중" : "등록"}
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}