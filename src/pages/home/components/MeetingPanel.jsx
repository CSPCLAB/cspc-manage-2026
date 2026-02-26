import { useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./MeetingPanel.module.css";

export default function MeetingPanel() {
  const [tab, setTab] = useState("agenda");

  const [agenda, setAgenda] = useState([
    { id: 1, content: "MT 일정 확정" },
    { id: 2, content: "예산안 검토" },
  ]);

  const [suggest, setSuggest] = useState([
    { id: 1, content: "스터디 공간 확장 요청" },
    { id: 2, content: "회의 시간 조정 제안" },
  ]);

  const [text, setText] = useState("");

  const onAdd = () => {
    if (!text.trim()) return;

    const newItem = { id: Date.now(), content: text };

    if (tab === "agenda") {
      setAgenda([newItem, ...agenda]);
    } else {
      setSuggest([newItem, ...suggest]);
    }

    setText("");
  };

  const onDelete = (id) => {
    const currentList = tab === "agenda" ? agenda : suggest;
    const target = currentList.find((x) => x.id === id);
    const label = tab === "agenda" ? "회의안건" : "건의사항";

    const ok = window.confirm(`이 ${label}을(를) 삭제할까요?\n\n- ${target?.content ?? ""}`);
    if (!ok) return;

    if (tab === "agenda") setAgenda(agenda.filter((item) => item.id !== id));
    else setSuggest(suggest.filter((item) => item.id !== id));
  };

  const list = tab === "agenda" ? agenda : suggest;

  return (
    <Panel
      title="회의/건의"
      right={
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${
              tab === "agenda" ? styles.active : ""
            }`}
            onClick={() => setTab("agenda")}
          >
            회의안건
          </button>
          <button
            className={`${styles.tabBtn} ${
              tab === "suggest" ? styles.active : ""
            }`}
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
            {list.map((item) => (
              <li key={item.id} className={styles.item}>
                <span>{item.content}</span>
                <button
                  className={styles.deleteBtn}
                  onClick={() => onDelete(item.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.editor}>
          <div className={styles.editorRow}>
            <input
              className={styles.input}
              placeholder={
                tab === "agenda"
                  ? "회의 안건을 한 줄로 추가"
                  : "건의 내용을 한 줄로 추가"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
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