import Panel from "../../../components/layout/Panel";
import styles from "./NoticePanel.module.css";

const DUMMY = Array.from({ length: 3 }, (_, i) => ({
  id: i + 1,
  title: `공지사항 ${i + 1}`,
  category: i % 2 === 0 ? "랩실 사용수칙" : "관리 수칙",
}));

export default function NoticePanel() {
  return (
    <Panel title="공지사항" className={styles.panelFull}>
      <ul className={styles.list}>
        {DUMMY.map((n) => (
          <li key={n.id} className={styles.item}>
            <div className={styles.cat}>{n.category}</div>
            <div className={styles.title}>{n.title}</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
