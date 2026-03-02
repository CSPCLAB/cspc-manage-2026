import Panel from "../../../components/layout/Panel";
import styles from "./NoticePanel.module.css";

const DUMMY = Array.from({ length: 1 }, (_, i) => ({
  id: i + 1,
  title: `CSPC 랩실 사용수칙`,
  category: i % 2 === 0 ? "랩실 사용수칙" : "관리 수칙",
}));

export default function NoticePanel() {
  return (
    <Panel title="공지사항" className={styles.panelFull}>
      <ul className={styles.list}>
        <h3>vercel 확인용 배포</h3>
      </ul>
    </Panel>
  );
}
