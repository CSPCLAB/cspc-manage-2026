import { useNavigate } from "react-router-dom";
import styles from "./HomePage.module.css";
import TopBar from "../../components/layout/TopBar";
import WeekSchedulePanel from "./components/WeekSchedulePanel";
import NoticePanel from "./components/NoticePanel";
import MeetingPanel from "./components/MeetingPanel";
import RequestsPanel from "./components/RequestsPanel";
import AdminAuthPanel from "./components/AdminAuthPanel"; // ✅ 추가
import LateRankPanel from "./components/LateRankPanel"; // ✅ 추가

export default function HomePage() {
  const NOTION_URL = import.meta.env.VITE_NOTION_URL || "https://www.notion.so/";
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <TopBar
        right={
          <div className={styles.topRightButtons}>
            <button
              className={styles.notionBtn}
              onClick={() => navigate("./admin")}
            >
              관리자 페이지
            </button>
            <button
              className={styles.notionBtn}
              onClick={() => navigate("./d104")}
            >
              실습실 관리
            </button>
            <button
              className={styles.notionBtn}
              onClick={() => window.open(NOTION_URL, "_blank", "noopener,noreferrer")}
            >
              노션 바로가기
            </button>
          </div>
        }
      />

      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.leftTop}>
            <NoticePanel />
            <AdminAuthPanel />
          </div>
          <div className={styles.leftBottom}>
            <WeekSchedulePanel />
          </div>
        </div>

        <div className={styles.right}>
          <MeetingPanel />
          <RequestsPanel />
          <LateRankPanel /> {/* ✅ 지각 랭킹 */}
        </div>
      </div>
    </div>
  );
}
