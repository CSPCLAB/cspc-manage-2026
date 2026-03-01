import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HomePage.module.css";
import TopBar from "../../components/layout/TopBar";
import WeekSchedulePanel from "./components/WeekSchedulePanel";
import NoticePanel from "./components/NoticePanel";
import MeetingPanel from "./components/MeetingPanel";
import RequestsPanel from "./components/RequestsPanel";
import AdminAuthPanel from "./components/AdminAuthPanel";
import LateRankPanel from "./components/LateRankPanel";

export default function HomePage() {
  const NOTION_URL = import.meta.env.VITE_NOTION_URL || "https://www.notion.so/";
  const navigate = useNavigate();

  const [adminPool, setAdminPool] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminError, setAdminError] = useState(null);

  const [rankingList, setRankingList] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [rankingError, setRankingError] = useState(null);

  function normalizeHexColor(s) {
    const v = (s ?? "").toString().trim();
    if (!v) return null;
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
  }

  useEffect(() => {
    async function fetchAdmins() {
      try {
        setLoadingAdmins(true);
        setAdminError(null);

        const res = await fetch("/api/users");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json.success) throw new Error(json.message || "학회원 불러오기 실패");

        const cleaned = (json.data ?? []).map((u) => ({
          id: String(u.id),
          name: u.name,
          color: normalizeHexColor(u.color_hex) ?? "#94a3b8",
          late_count: u.late_count ?? 0,
        }));

        setAdminPool(cleaned);
      } catch (err) {
        setAdminError(err?.message || String(err));
      } finally {
        setLoadingAdmins(false);
      }
    }

    fetchAdmins();
  }, []);

  useEffect(() => {
    async function fetchRanking() {
      try {
        setLoadingRanking(true);
        setRankingError(null);

        const res = await fetch("/api/users/ranking");
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.message || "랭킹 불러오기 실패");
        }

        const cleaned = (json.data ?? []).map((u) => ({
          id: String(u.id),
          name: u.name,
          color: normalizeHexColor(u.color_hex) ?? "#94a3b8",
          late_count: u.late_count ?? 0,
        }));

        setRankingList(cleaned);
      } catch (err) {
        setRankingError(err?.message || String(err));
      } finally {
        setLoadingRanking(false);
      }
    }

    fetchRanking();
  }, []);

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
            <WeekSchedulePanel 
              adminPool={adminPool} 
              loadingAdmins={loadingAdmins} 
              adminError={adminError}/>
          </div>
        </div>

        <div className={styles.right}>
          <MeetingPanel />
          <RequestsPanel />
          <LateRankPanel 
            rankingList={rankingList}
            loadingRanking={loadingRanking}
            rankingError={rankingError} 
          />
        </div>
      </div>
    </div>
  );
}
