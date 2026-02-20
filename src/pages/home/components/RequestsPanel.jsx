import { useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./RequestsPanel.module.css";

const DUMMY_SUPPLY = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  item_name: `비품요청 ${i + 1}`,
  is_completed: i % 5 === 0,
}));

const DUMMY_SUGGEST = Array.from({ length: 22 }, (_, i) => ({
  id: i + 1,
  content: `건의사항 예시 ${i + 1}`,
}));

export default function RequestsPanel() {
  const [tab, setTab] = useState("supply"); // supply | suggest
  const [text, setText] = useState("");

  const onAdd = () => {
    if (!text.trim()) return;
    if (tab === "supply") alert(`(더미) 비품요청 등록: ${text}`);
    else alert(`(더미) 건의사항 등록: ${text}`);
    setText("");
  };

  const list =
    tab === "supply"
      ? DUMMY_SUPPLY.filter((x) => !x.is_completed)
      : DUMMY_SUGGEST;

  return (
    <Panel
      title="비품/건의"
      right={
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${tab === "supply" ? styles.active : ""}`}
            onClick={() => setTab("supply")}
          >
            비품요청
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
          <ul className={styles.list}>
            {list.map((x) =>
              tab === "supply" ? (
                <li key={x.id} className={styles.item}>
                  {x.item_name}
                </li>
              ) : (
                <li key={x.id} className={styles.item}>
                  {x.content}
                </li>
              )
            )}
          </ul>
        </div>

        <div className={styles.editor}>
          <div className={styles.editorRow}>
            <input
              className={styles.input}
              placeholder={tab === "supply" ? "필요한 비품 이름" : "건의 내용을 한 줄로"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
            />
            <button className={styles.addBtn} onClick={onAdd}>
              등록
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
