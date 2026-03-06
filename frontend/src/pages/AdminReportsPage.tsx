import { useEffect, useState } from "react";
import { StatusBox } from "../components/StatusBox";
import { useAuth } from "../hooks/useAuth";
import { banByReport, getAdminUserReports } from "../features/admin/admin-service";
import { AdminUserReport } from "../types/models";

export function AdminReportsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<AdminUserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await getAdminUserReports(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load user reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const onBan = async (reportId: string) => {
    if (!token) return;
    try {
      await banByReport(token, reportId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ban action failed.");
    }
  };

  return (
    <section>
      <h1>Admin User Reports</h1>
      <StatusBox loading={loading} error={error} empty={rows.length === 0} emptyText="No reports." />
      {rows.length > 0 && (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              {row.reported.username}: {row.reason} [{row.status}]
              {row.status === "OPEN" && (
                <button type="button" onClick={() => void onBan(row.id)}>
                  Ban user
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
