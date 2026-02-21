import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "./Pages/LoginPage";
import DashboardPage from "./Pages/DashboardPage";
import StudentDetailPage from "./Pages/StudentDetailPage";
import AnalyticsPage from "./Pages/AnalyticsPage";
import StudentsManagementPage from "./Pages/StudentsManagementPage";
import MarksManagementPage from "./Pages/MarksManagementPage";

function App() {
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
              <ProtectedRoute allowedRoles={["teacher", "student"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/:id"
            element={
              <ProtectedRoute allowedRoles={["teacher", "student"]}>
                <StudentDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students-management"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <StudentsManagementPage />
              </ProtectedRoute>
            }
          />

          {/* ONLY TEACHER CAN MODIFY MARKS */}
          <Route
            path="/marks-management"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <MarksManagementPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;