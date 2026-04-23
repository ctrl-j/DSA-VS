import "../styles/theme.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { WebSocketProvider } from "../providers/WebSocketProvider";
import { NavBar } from "../components/layout/NavBar";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { DashboardPage } from "../pages/DashboardPage";
import { QueuePage } from "../pages/QueuePage";
import MatchPage from "../pages/MatchPage";
import { ProfilePage } from "../pages/ProfilePage";
import { EditProfilePage } from "../pages/EditProfilePage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { FriendsPage } from "../pages/FriendsPage";
import { BlockedPage } from "../pages/BlockedPage";
import { MessagesPage } from "../pages/MessagesPage";
import { EloPage } from "../pages/EloPage";
import { ReportUserPage } from "../pages/ReportUserPage";
import { ReportBugPage } from "../pages/ReportBugPage";
import { AdminChatsPage } from "../pages/AdminChatsPage";
import { AdminBugReportsPage } from "../pages/AdminBugReportsPage";
import { AdminReportsPage } from "../pages/AdminReportsPage";
import { HistoryPage } from "../pages/HistoryPage";
import { StatsPage } from "../pages/StatsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <p role="alert">Authorization error: admin only.</p>;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  const { token } = useAuth();

  return (
    <WebSocketProvider token={token}>
      <NavBar />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/queue" element={<ProtectedRoute><QueuePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="/blocked" element={<ProtectedRoute><BlockedPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/elo" element={<ProtectedRoute><EloPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
        <Route path="/report-user" element={<ProtectedRoute><ReportUserPage /></ProtectedRoute>} />
        <Route path="/report-bug" element={<ProtectedRoute><ReportBugPage /></ProtectedRoute>} />

        <Route path="/admin/chats" element={<AdminRoute><AdminChatsPage /></AdminRoute>} />
        <Route path="/admin/bug-reports" element={<AdminRoute><AdminBugReportsPage /></AdminRoute>} />
        <Route path="/admin/reports/users" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />

        <Route path="/match/:matchId" element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </WebSocketProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
