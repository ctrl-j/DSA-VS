import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute, ProtectedRoute } from "./guards";
import { DashboardPage } from "../pages/DashboardPage";
import { RegisterPage } from "../pages/RegisterPage";
import { LoginPage } from "../pages/LoginPage";
import { ProfilePage } from "../pages/ProfilePage";
import { EditProfilePage } from "../pages/EditProfilePage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { FriendsPage } from "../pages/FriendsPage";
import { BlockedPage } from "../pages/BlockedPage";
import { MessagesPage } from "../pages/MessagesPage";
import { EloPage } from "../pages/EloPage";
import { QueuePage } from "../pages/QueuePage";
import { AdminChatsPage } from "../pages/AdminChatsPage";
import { ReportUserPage } from "../pages/ReportUserPage";
import { ReportBugPage } from "../pages/ReportBugPage";
import { AdminBugReportsPage } from "../pages/AdminBugReportsPage";
import { AdminReportsPage } from "../pages/AdminReportsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/blocked" element={<BlockedPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/elo" element={<EloPage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/report-user" element={<ReportUserPage />} />
        <Route path="/report-bug" element={<ReportBugPage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin/chats" element={<AdminChatsPage />} />
        <Route path="/admin/bug-reports" element={<AdminBugReportsPage />} />
        <Route path="/admin/reports/users" element={<AdminReportsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
