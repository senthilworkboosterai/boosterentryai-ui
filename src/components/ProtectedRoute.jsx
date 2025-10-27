// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const location = useLocation();

  // 🚫 Not logged in → redirect to login
  if (isLoggedIn !== "true") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ Logged in → show the page
  return children;
}
