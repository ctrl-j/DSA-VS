import { useEffect, useState } from "react";
import { StatusBox } from "../components/StatusBox";
import { useAuth } from "../hooks/useAuth";
import { getElo } from "../features/profile/profile-service";

export function EloPage() {
  const { token } = useAuth();
  const [elo, setElo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getElo(token);
        setElo(result.elo);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load elo.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  return (
    <section>
      <h1>Elo</h1>
      <StatusBox loading={loading} error={error} empty={elo === null} emptyText="No Elo available." />
      {elo !== null && <p>Current Elo: {elo}</p>}
    </section>
  );
}
