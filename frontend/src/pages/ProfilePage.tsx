import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBox } from "../components/StatusBox";
import { useAuth } from "../hooks/useAuth";
import { getProfile } from "../features/profile/profile-service";
import { User } from "../types/models";

export function ProfilePage() {
  const { token } = useAuth();
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        setData(await getProfile(token));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Profile load failed.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  return (
    <section>
      <h1>Profile</h1>
      <StatusBox loading={loading} error={error} empty={!data} emptyText="No profile." />
      {data && (
        <div>
          <p>Username: {data.username}</p>
          <p>Elo: {data.elo}</p>
          <p>Bio: {data.profile?.bio || "-"}</p>
          <p>Avatar URL: {data.profile?.avatarUrl || "-"}</p>
          <Link to="/profile/edit">Edit profile</Link>
          <br />
          <Link to="/change-password">Change password</Link>
        </div>
      )}
    </section>
  );
}
