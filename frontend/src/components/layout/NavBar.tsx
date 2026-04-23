import "./NavBar.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { FriendsPanel } from "./FriendsPanel";

export function NavBar() {
  const { user, logout } = useAuth();
  const [friendsOpen, setFriendsOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <Link to="/dashboard" className="navbar__logo">
          DSA·VS
        </Link>

        <div className="navbar__right">
          {user ? (
            <>
              <button
                type="button"
                className="navbar__friends-btn"
                onClick={() => setFriendsOpen(true)}
              >
                Friends
              </button>
              <Link to="/profile" className="navbar__user">{user.username}</Link>
              <button
                type="button"
                className="navbar__logout"
                onClick={() => void logout()}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="navbar__login-link">
              Login
            </Link>
          )}
        </div>
      </nav>

      {user && (
        <FriendsPanel open={friendsOpen} onClose={() => setFriendsOpen(false)} />
      )}
    </>
  );
}
