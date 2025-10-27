import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Monitoring from "./pages/Monitoring";
import HumanReview from "./pages/HumanReview";
import FixReview from "./pages/FixReview";
import InvoiceView from "./pages/invoiceview";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ correct import path

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* ✅ All protected routes inside this wrapper */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/human-review" element={<HumanReview />} />
      </Route>

      {/* ✅ Protected pages without layout */}
      <Route
        path="/human-review/fix/:id"
        element={
          <ProtectedRoute>
            <FixReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice/:id"
        element={
          <ProtectedRoute>
            <InvoiceView />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
