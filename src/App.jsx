import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import AdminPage from "./pages/admin/AdminPage";
import D104 from "./pages/D104";
import D105 from "./pages/D105";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/d104" element={<D104 />} />
      <Route path="/d105" element={<D105 />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
