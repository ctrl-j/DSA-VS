import "../styles/theme.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { WebSocketProvider, useWs } from "../providers/WebSocketProvider";
import { NavBar } from "../components/layout/NavBar";
import { NotificationToast } from "../components/layout/NotificationToast";
import type { WsMatchFound } from "../types";
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
import { LeaderboardPage } from "../pages/LeaderboardPage";
import { SubmitProblemPage } from "../pages/SubmitProblemPage";
import { TestCaseSubmitPage } from "../pages/TestCaseSubmitPage";
import { MySubmissionsPage } from "../pages/MySubmissionsPage";
import { EditProblemPage } from "../pages/EditProblemPage";
import { AdminReviewPage } from "../pages/AdminReviewPage";
import { CodeHistoryPage } from "../pages/CodeHistoryPage";
import { GlobalStatsPage } from "../pages/GlobalStatsPage";
import { PrivateMatchPage } from "../pages/PrivateMatchPage";
import { FocusDashboardPage } from "../pages/FocusDashboardPage";
import { LanguageStatsPage } from "../pages/LanguageStatsPage";

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

/** Global listener: navigates to match page when match.found fires (e.g. from a challenge). */
function MatchFoundRedirector() {
  const { subscribe } = useWs();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = subscribe("match.found", (payload: WsMatchFound) => {
      // Don't redirect if already on the queue page (it has its own handler with a countdown)
      if (location.pathname === "/queue") return;
      navigate(`/match/${payload.matchId}`);
    });
    return unsub;
  }, [subscribe, navigate, location.pathname]);

  return null;
}

function AppRoutes() {
  const { token } = useAuth();

  return (
    <WebSocketProvider token={token}>
      <MatchFoundRedirector />
      <NavBar />
      <NotificationToast />
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
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        <Route path="/problems/submit" element={<ProtectedRoute><SubmitProblemPage /></ProtectedRoute>} />
        <Route path="/problems/mine" element={<ProtectedRoute><MySubmissionsPage /></ProtectedRoute>} />
        <Route path="/problems/:id/edit" element={<ProtectedRoute><EditProblemPage /></ProtectedRoute>} />
        <Route path="/problems/:id/test-cases" element={<ProtectedRoute><TestCaseSubmitPage /></ProtectedRoute>} />
        <Route path="/code-history" element={<ProtectedRoute><CodeHistoryPage /></ProtectedRoute>} />
        <Route path="/global-stats" element={<GlobalStatsPage />} />
        <Route path="/private-match" element={<ProtectedRoute><PrivateMatchPage /></ProtectedRoute>} />
        <Route path="/focus" element={<ProtectedRoute><FocusDashboardPage /></ProtectedRoute>} />
        <Route path="/language-stats" element={<ProtectedRoute><LanguageStatsPage /></ProtectedRoute>} />
        <Route path="/report-user" element={<ProtectedRoute><ReportUserPage /></ProtectedRoute>} />
        <Route path="/report-bug" element={<ProtectedRoute><ReportBugPage /></ProtectedRoute>} />

        <Route path="/admin/chats" element={<AdminRoute><AdminChatsPage /></AdminRoute>} />
        <Route path="/admin/bug-reports" element={<AdminRoute><AdminBugReportsPage /></AdminRoute>} />
        <Route path="/admin/reports/users" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
        <Route path="/admin/problems" element={<AdminRoute><AdminReviewPage /></AdminRoute>} />

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
