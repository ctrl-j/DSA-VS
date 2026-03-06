import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="nav">
      <Link to="/">Home</Link>
      {!user && <Link to="/register">Register</Link>}
      {!user && <Link to="/login">Login</Link>}
      {user && <Link to="/profile">Profile</Link>}
      {user && <Link to="/friends">Friends</Link>}
      {user && <Link to="/blocked">Blocked</Link>}
      {user && <Link to="/messages">Messages</Link>}
      {user && <Link to="/queue">Queue</Link>}
      {user && <Link to="/report-user">Report User</Link>}
      {user && <Link to="/report-bug">Report Bug</Link>}
      {user?.isAdmin && <Link to="/admin/chats">Admin Chats</Link>}
      {user?.isAdmin && <Link to="/admin/bug-reports">Admin Bug Reports</Link>}
      {user?.isAdmin && <Link to="/admin/reports/users">Admin User Reports</Link>}
      {user && (
        <button type="button" onClick={() => void logout()}>
          Logout
        </button>
      )}
    </nav>
  );
}
