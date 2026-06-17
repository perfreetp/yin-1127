import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ImportPage from "@/pages/ImportPage";
import SampleBasketPage from "@/pages/SampleBasketPage";
import ComparePage from "@/pages/ComparePage";
import MarkPage from "@/pages/MarkPage";
import WorkpaperPage from "@/pages/WorkpaperPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/import" replace />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/sample" element={<SampleBasketPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/mark" element={<MarkPage />} />
        <Route path="/workpaper" element={<WorkpaperPage />} />
        <Route path="*" element={<Navigate to="/import" replace />} />
      </Routes>
    </Router>
  );
}
