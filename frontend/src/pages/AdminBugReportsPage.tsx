import { useEffect, useState } from "react";
import { StatusBox } from "../components/StatusBox";
import { useAuth } from "../hooks/useAuth";
import { getAdminBugReports } from "../features/admin/admin-service";
import { BugReport } from "../types/models";

export function AdminBugReportsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        setRows(await getAdminBugReports(token));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load bug reports.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  return (
    <section>
      <h1>Admin Bug Reports</h1>
      <StatusBox loading={loading} error={error} empty={rows.length === 0} emptyText="No bug reports." />
      {rows.length > 0 && (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>{row.title}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
