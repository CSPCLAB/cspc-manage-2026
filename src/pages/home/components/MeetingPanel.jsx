import { useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./MeetingPanel.module.css";

const DUMMY = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  content: `회의 안건 예시 ${i + 1}`,
}));

export default function MeetingPanel() {
  const [text, setText] = useState("");

  const onAdd = () => {
    if (!text.trim()) return;
    alert(`(더미) 안건 등록: ${text}`);
    setText("");
  };

  return (
    <Panel title="회의 안건">
      <div className={styles.bodyWrap}>
        <div className={styles.scrollArea}>
          <ul className={styles.list}>
            {DUMMY.map((a) => (
              <li key={a.id} className={styles.item}>
                {a.content}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.editor}>
          <div className={styles.editorRow}>
            <input
              className={styles.input}
              placeholder="안건을 한 줄로 추가"
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
