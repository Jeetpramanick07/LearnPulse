import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "./Pages/LoginPage";
import DashboardPage from "./Pages/DashboardPage";
import StudentDetailPage from "./Pages/StudentDetailPage";
import AnalyticsPage from "./Pages/AnalyticsPage";
import StudentsManagementPage from "./Pages/StudentsManagementPage";
import MarksManagementPage from "./Pages/MarksManagementPage";
import SuperAdminPanel from "./Pages/SuperAdminPanel";

function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  // ── Secret key combo: Shift + Ctrl + A ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.shiftKey && e.ctrlKey && e.key === "A") {
        setShowAdmin(prev => !prev);
      }
      // Also close with Escape
      if (e.key === "Escape") {
        setShowAdmin(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public */}
          <Route path="/" element={<LoginPage />} />

          {/* All logged users */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["faculty", "hod", "student"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/:id"
            element={
              <ProtectedRoute allowedRoles={["faculty", "hod", "student"]}>
                <StudentDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={["faculty", "hod"]}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students-management"
            element={
              <ProtectedRoute allowedRoles={["faculty", "hod"]}>
                <StudentsManagementPage />
              </ProtectedRoute>
            }
          />

          {/* FACULTY CAN EDIT OWN SUBJECTS, HOD CAN EDIT ALL */}
          <Route
            path="/marks-management"
            element={
              <ProtectedRoute allowedRoles={["faculty", "hod"]}>
                <MarksManagementPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />

        </Routes>

        {/* ── Super Admin Overlay (Shift + Ctrl + A to open, Esc to close) ── */}
        {showAdmin && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            animation: "adminFadeIn 0.2s ease",
          }}>
            <style>{`
              @keyframes adminFadeIn {
                from { opacity: 0; transform: scale(0.98); }
                to   { opacity: 1; transform: scale(1); }
              }
            `}</style>
            {/* Close button visible in top-right corner */}
            <button
              onClick={() => setShowAdmin(false)}
              style={{
                position: "fixed", top: "16px", right: "16px", zIndex: 10000,
                background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444",
                color: "#f87171", borderRadius: "8px", padding: "8px 16px",
                fontSize: "13px", fontFamily: "sans-serif", cursor: "pointer",
                backdropFilter: "blur(4px)",
              }}
            >
              ✕ Close Admin (Esc)
            </button>
            <SuperAdminPanel onClose={() => setShowAdmin(false)} />
          </div>
        )}

      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;