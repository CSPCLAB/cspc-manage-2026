import { useState } from "react";
import Panel from "../../../components/layout/Panel";
import styles from "./RequestsPanel.module.css";

<<<<<<< HEAD
export default function RequestsPanel() {
  const [items, setItems] = useState([
    { id: 1, item_name: "마우스", is_completed: false },
    { id: 2, item_name: "키보드", is_completed: false },
    { id: 3, item_name: "HDMI 케이블", is_completed: true },
  ]);

=======
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
>>>>>>> origin/main
  const [text, setText] = useState("");

  const onAdd = () => {
    if (!text.trim()) return;
<<<<<<< HEAD

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
=======
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
>>>>>>> origin/main
          </ul>
        </div>

        <div className={styles.editor}>
          <div className={styles.editorRow}>
            <input
              className={styles.input}
<<<<<<< HEAD
              placeholder="필요한 비품 이름"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
=======
              placeholder={tab === "supply" ? "필요한 비품 이름" : "건의 내용을 한 줄로"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
>>>>>>> origin/main
            />
            <button className={styles.addBtn} onClick={onAdd}>
              등록
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
