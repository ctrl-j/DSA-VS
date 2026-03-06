import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading session...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading session...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <p role="alert">Authorization error: admin only.</p>;
  return <Outlet />;
}
