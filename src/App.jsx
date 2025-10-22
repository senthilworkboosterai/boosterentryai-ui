import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Monitoring from "./pages/Monitoring";
import HumanReview from "./pages/HumanReview";
import FixReview from "./pages/FixReview";
import InvoiceView from "./pages/invoiceview";

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
        <Route path="/human-review" element={<HumanReview />} />
      </Route>

      {/* ❌ Outside layout — no sidebar */}
      <Route path="/human-review/fix/:id" element={<FixReview />} />
      <Route path="/invoice/:id" element={<InvoiceView />} />
    </Routes>
  );
}
