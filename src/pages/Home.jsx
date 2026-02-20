import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ padding: 40 }}>
      <h1>CSPC</h1>

      <Link to="/d104">
        <button>요청게시판 가기</button>
      </Link>
    </div>
  );
}