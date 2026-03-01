import { useEffect, useMemo, useRef, useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./RequestsPanel.module.css";

// ✅ {success,data,message} 응답 + JSON 아닌 응답 방지
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
  return json; // { success, data, message }
}

export default function RequestsPanel() {
  const [rawItems, setRawItems] = useState([]);
  const [text, setText] = useState("");

  const [fetching, setFetching] = useState(false); // ✅ 목록 로딩 표시용(원하면 사용)
  const [mutating, setMutating] = useState(false); // ✅ 등록/체크/삭제 처리중
  const [error, setError] = useState("");

  const abortRef = useRef(null);

  // ✅ 완료는 아래로 정렬
  const items = useMemo(() => {
    const list = Array.isArray(rawItems) ? rawItems : [];
    const incompleted = list.filter((x) => !x.is_completed);
    const completed = list.filter((x) => x.is_completed);
    return [...incompleted, ...completed];
  }, [rawItems]);

  const refetch = async ({ silent = false } = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!silent) setFetching(true);
    setError("");

    try {
      const json = await fetchJson("/api/supplies", {
        method: "GET",
        signal: controller.signal,
      });

      // 기대: [{ id, item_name, is_completed }]
      const list = Array.isArray(json?.data) ? json.data : [];
      setRawItems(
        list
          .filter((x) => x && x.id != null)
          .map((x) => ({
            ...x,
            id: Number(x.id),
            is_completed: Boolean(x.is_completed),
          }))
      );
    } catch (e) {
      if (e?.name !== "AbortError") setError(e?.message ?? "목록을 불러오지 못했어요.");
    } finally {
      if (!silent) setFetching(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAdd = async () => {
    const item_name = text.trim();
    if (!item_name || mutating) return;

    setMutating(true);
    setError("");

    try {
      await fetchJson("/api/supplies", {
        method: "POST",
        body: JSON.stringify({ item_name }),
      });

      setText("");
      await refetch({ silent: true }); // ✅ 등록 후 로딩문구 없이 갱신
    } catch (e) {
      setError(e?.message ?? "등록에 실패했어요.");
    } finally {
      setMutating(false);
    }
  };

  const toggleComplete = async (id) => {
    if (mutating) return;

    const current = rawItems.find((x) => x.id === id);
    if (!current) return;

    const nextValue = !current.is_completed;

    // ✅ 낙관적 업데이트: 즉시 UI 반영 + 정렬도 즉시 바뀜
    setRawItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, is_completed: nextValue } : x))
    );

    setMutating(true);
    setError("");

    try {
      // ✅ PATCH로 is_completed 업데이트 (백엔드가 PUT이면 PUT으로 변경)
      await fetchJson(`/api/supplies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_completed: nextValue }),
      });

      // ✅ 필요하면 silent refetch로 서버 기준 재정렬/동기화
      await refetch({ silent: true });
    } catch (e) {
      // ❗ 실패하면 롤백
      setRawItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, is_completed: !nextValue } : x))
      );
      setError(e?.message ?? "완료 처리에 실패했어요.");
    } finally {
      setMutating(false);
    }
  };

  const onDelete = async (id) => {
    if (mutating) return;

    const target = rawItems.find((x) => x.id === id);
    const ok = window.confirm(`"${target?.item_name ?? "이 항목"}"을(를) 삭제할까요?`);
    if (!ok) return;

    // ✅ 낙관적 삭제
    const snapshot = rawItems;
    setRawItems((prev) => prev.filter((x) => x.id !== id));

    setMutating(true);
    setError("");

    try {
      await fetchJson(`/api/supplies/${id}`, { method: "DELETE" });
      await refetch({ silent: true });
    } catch (e) {
      // ❗ 실패 롤백
      setRawItems(snapshot);
      setError(e?.message ?? "삭제에 실패했어요.");
    } finally {
      setMutating(false);
    }
  };

  return (
    <Panel title="비품요청">
      <div className={styles.bodyWrap}>
        <div className={styles.scrollArea}>
          {error && <div className={styles.errorMsg}>{error}</div>}

          <ul className={styles.list}>
            {items.map((item) => (
              <li
                key={item.id}
                className={`${styles.item} ${item.is_completed ? styles.completed : ""}`}
              >
                <div className={styles.left}>
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={() => toggleComplete(item.id)}
                    disabled={mutating}
                  />
                  <span>{item.item_name}</span>
                </div>

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

          {!fetching && items.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <div>
                <div className={styles.emptyTitle}>요청이 비어 있어요</div>
                <div className={styles.emptyDesc}>
                  필요한 비품을 아래 입력창에서 추가해보세요.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.editor}>
          <div className={styles.editorRow}>
            <input
              className={styles.input}
              placeholder="필요한 비품 이름"
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