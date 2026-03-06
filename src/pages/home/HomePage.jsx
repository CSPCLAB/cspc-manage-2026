import { useEffect, useRef, useState } from "react";
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
  const NOTION_URL =
    import.meta.env.VITE_NOTION_URL ||
    "https://www.notion.so/cspclab/CSPC-LAB-40d34473aee644978b4bef89c6db55c2";

  const navigate = useNavigate();
  const outerRef = useRef(null);

  // ✅ 이 값이 핵심: 지금 화면에서 여백이 많이 남으니 기준 폭을 조금 키움
  const BASE_W = 1700;

  // ✅ 너무 좁아지면 1열 스택으로 전환할 기준
  const STACK_BREAKPOINT = 1250;

  useEffect(() => {
    const applyScale = () => {
      const vw = window.innerWidth;
      const shouldStack = vw <= STACK_BREAKPOINT;

      if (shouldStack) {
        outerRef.current?.style.setProperty("--use-scale", "0");
        return;
      }

      const pad = 16 * 2;                // pageOuter padding 기준
      const availW = vw - pad;

      const s = Math.min(availW / BASE_W, 1);  // ✅ 가로 기준 스케일

      const el = outerRef.current;
      if (!el) return;

      el.style.setProperty("--use-scale", "1");
      el.style.setProperty("--app-scale", String(s));
      el.style.setProperty("--app-base-w", `${BASE_W}px`);
    };

    applyScale();
    window.addEventListener("resize", applyScale);
    return () => window.removeEventListener("resize", applyScale);
  }, []);

  // ---- (여기 아래는 너 기존 코드 그대로) ----
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
          id: u.id,
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
    <div ref={outerRef} className={styles.pageOuter}>
      <div className={styles.page}>
        <TopBar
          right={
            <div className={styles.topRightButtons}>
              <button className={styles.notionBtn} onClick={() => navigate("./admin")}>
                관리자 페이지
              </button>
              <button className={styles.notionBtn} onClick={() => navigate("./d104")}>
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
                adminError={adminError}
              />
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
    </div>
  );
}