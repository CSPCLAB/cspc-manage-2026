import Panel from "../../../components/layout/Panel";
import styles from "./NoticePanel.module.css";

export default function NoticePanel() {
  return (
    <Panel title="공지사항" className={styles.panelFull}>
      <div className={styles.list}>
        <h4>1. CSPC LAB 관리수칙</h4>
        <ul>
          <li>관리 시간에 맞춰 랩실에 오기</li>
          <li>첫 타임 관리자는 랩실 문 열기</li>
          <li>마지막 타임 관리자는 관리 종료 후 랩실 잠그기</li>
          <li>교수님 또는 조교님의 요청사항을 처리하고, 혼자 해결하기 어려울 경우 단톡방에 문의하기</li>
        </ul>
        <h4>2. CSPC LAB 관리실 이용수칙</h4>
        <ul>
          <li>외부인 출입 자제</li>
          <li>음주, 숙박 금지</li>
          <li>본인이 이용한 자리는 깨끗하게 치우기</li>
          <li>수업이 있는 시간에는 관리자실에서 음식 섭취 금지</li>
          <li>쓰레기통이 꽉차있다면 비우기</li>
        </ul>
        <h4>3. CSPC LAB 내부 행사</h4>
        <ul>
          <li>신입부원 모집</li>
          <li>신입생 환영회</li>
          <li>봄소풍</li>
          <li>여름 MT</li>
          <li>크리스마스 파티</li>
          <li>겨울 MT</li>
        </ul>
      </div>
    </Panel>
  );
}
