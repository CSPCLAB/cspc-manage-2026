import styles from "./AdminPage.module.css";
import TopBar from "../../components/layout/TopBar";

export default function AdminPage() {
  return (
    <div className={styles.page}>
      <TopBar title="관리자 페이지" right={<a className={styles.link} href="/">메인으로</a>} />
      <div className={styles.card}>
        관리자 기능은 여기서 구현하면 됩니다. (임시 페이지)
      </div>
    </div>
  );
}
