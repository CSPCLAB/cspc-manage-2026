import Panel from "../../../components/layout/Panel";
import styles from "./NoticePanel.module.css";

export default function NoticePanel() {
  return (
    <Panel title="공지사항" className={styles.panelFull}>
      <div className={styles.list}>
        <h4>1. CSPC LAB 관리실</h4>
        <ul>
          <li>본인이 이용한 자리는 깨끗하게 치우기</li>
          <li>냉장고에 음식 넣기 전 꼭 이름 쓰기</li>
          <li>본인이 이용한 자리는 깨끗하게 치우기</li>
          <li></li>
        </ul>
        <h4>2. D104, D105 관리하기</h4>
        <ul>
          <li>첫 타임 관리자는 강의실 문 열기</li>
          <li>마지막 타임 관리자는 관리 종료 후 강의실 문 잠그기</li>
          <li>교수님 또는 조교님의 요청사항을 처리하고, 혼자 해결하기 어려울 경우 단톡방에 문의하기</li>
          <li>고장난 컴퓨터가 있는경우 고장표시 하기</li>
          <li>수업이 있는 시간에는 관리자실에서 음식 섭취 자제하기</li>
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
