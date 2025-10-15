import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Monitoring from "./pages/Monitoring";
import HumanReview from "./pages/HumanReview";
import Login from "./pages/Login";
import FixReview from "./pages/FixReview";

export default function App() {
  return (
    <Routes>
      {/* Default route → go to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* All dashboard pages use shared layout */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/Human-review" element={<HumanReview />} />
       

      </Route>

      {/* Optional login page */}
      <Route path="/human-review/fix/:id" element={<FixReview />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
