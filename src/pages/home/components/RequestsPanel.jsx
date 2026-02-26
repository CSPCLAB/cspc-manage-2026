import { useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./RequestsPanel.module.css";

export default function RequestsPanel() {
  const [items, setItems] = useState([
    { id: 1, item_name: "마우스", is_completed: false },
    { id: 2, item_name: "키보드", is_completed: false },
    { id: 3, item_name: "HDMI 케이블", is_completed: true },
  ]);

  const [text, setText] = useState("");

  const onAdd = () => {
    if (!text.trim()) return;

    const newItem = {
      id: Date.now(),
      item_name: text,
      is_completed: false,
    };

    setItems([newItem, ...items]);
    setText("");
  };

  const toggleComplete = (id) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, is_completed: !item.is_completed }
          : item
      )
    );
  };

  const onDelete = (id) => {
    const target = items.find((x) => x.id === id);
    const ok = window.confirm(`"${target?.item_name ?? "이 항목"}"을(를) 삭제할까요?`);
    if (!ok) return;

    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <Panel title="비품요청">
      <div className={styles.bodyWrap}>
        <div className={styles.scrollArea}>
          <ul className={styles.list}>
            {items.map((item) => (
              <li
                key={item.id}
                className={`${styles.item} ${
                  item.is_completed ? styles.completed : ""
                }`}
              >
                <div className={styles.left}>
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={() => toggleComplete(item.id)}
                  />
                  <span>{item.item_name}</span>
                </div>

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
              placeholder="필요한 비품 이름"
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