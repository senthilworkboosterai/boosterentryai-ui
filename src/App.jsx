import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Monitoring from "./pages/Monitoring";
import ManualReview from "./pages/ManualReview";
import Login from "./pages/Login";

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
        <Route path="/manual-review" element={<ManualReview />} />
      </Route>

      {/* Optional login page */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
