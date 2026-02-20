import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import D104 from "./pages/D104";
import D105 from "./pages/D105";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/d104" element={<D104 />} />
      <Route path="/d105" element={<D105 />} />
    </Routes>
  );
}