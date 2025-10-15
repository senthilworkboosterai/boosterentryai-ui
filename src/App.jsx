import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Monitoring from "./pages/Monitoring";
import ManualReview from "./pages/ManualReview";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      {/* Default route — redirect "/" to "/dashboard" */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Main routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/monitoring" element={<Monitoring />} />
      <Route path="/manual-review" element={<ManualReview />} />

      {/* Optional login route (still works if accessed manually) */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
