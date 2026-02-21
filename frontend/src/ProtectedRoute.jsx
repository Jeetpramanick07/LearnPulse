import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = null }) => {

  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {

    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );

  }

  // If not logged in → go to login page
  if (!user) {

    return <Navigate to="/" replace />;

  }

  // If roles restriction exists and user role not allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {

    return (
      <div className="flex items-center justify-center min-h-screen">

        <div className="text-center">

          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Access Denied
          </h2>

          <p className="text-gray-600 mb-4">
            You do not have permission to access this page.
          </p>

          <button
            onClick={() => window.location.href = "/dashboard"}
            className="bg-gray-900 text-white px-4 py-2 rounded"
          >
            Go to Dashboard
          </button>

        </div>

      </div>
    );

  }

  // Access allowed
  return children;

};

export default ProtectedRoute;