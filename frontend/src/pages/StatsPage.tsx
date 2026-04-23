import "./StatsPage.css";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { MatchHistoryEntry } from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_GOLD = "#CFB991";
const CHART_WIN = "#22c55e";
const CHART_LOSS = "#ef4444";
const CHART_DRAW = "#555960";
const CHART_BG = "#111110";
const CHART_GRID = "#1e1d1b";
const CHART_TEXT = "#8a8580";

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "#22c55e",
  MEDIUM: "#f59e0b",
  HARD: "#ef4444",
};

type TimePeriod = "all" | "7d" | "30d" | "90d";
type ModeFilter = "all" | "RANKED" | "FFA";
type CategoryFilter = "all" | "Math" | "Strings" | "Logic" | "Arrays" | "Sorting" | "Searching" | "Stacks";
type DifficultyFilter = "all" | "EASY" | "MEDIUM" | "HARD";

export function StatsPage() {
  const { user, token } = useAuth();
  const [entries, setEntries] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api<MatchHistoryEntry[]>("GET", "/api/matches/history", {
      token,
      query: { limit: 100, offset: 0 },
    })
      .then((data) => {
        setEntries(data);
        setError(null);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load statistics";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Filter entries client-side
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Time period filter
    if (timePeriod !== "all") {
      const now = Date.now();
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
      const cutoff = now - (daysMap[timePeriod] ?? 0) * 24 * 60 * 60 * 1000;
      result = result.filter(
        (e) => new Date(e.match.createdAt).getTime() >= cutoff
      );
    }

    // Mode filter
    if (modeFilter !== "all") {
      result = result.filter((e) => e.match.mode === modeFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(
        (e) =>
          e.match.problem?.category?.toLowerCase() ===
          categoryFilter.toLowerCase()
      );
    }

    // Difficulty filter
    if (difficultyFilter !== "all") {
      result = result.filter(
        (e) => e.match.problem?.difficulty === difficultyFilter
      );
    }

    return result;
  }, [entries, timePeriod, modeFilter, categoryFilter, difficultyFilter]);

  const stats = useMemo(() => {
    if (!user || filteredEntries.length === 0) return null;

    let wins = 0;
    let losses = 0;
    let draws = 0;

    const eloOverTime: { date: string; elo: number }[] = [];
    const winsByCategory: Record<string, number> = {};
    const difficultyCount: Record<string, number> = {};

    // Sort entries by date ascending for the ELO chart
    const sorted = [...filteredEntries].sort(
      (a, b) =>
        new Date(a.match.createdAt).getTime() -
        new Date(b.match.createdAt).getTime()
    );

    // Track win/loss sequence for rolling win rate
    const winSequence: boolean[] = [];

    for (const entry of sorted) {
      const eloDelta = (entry.endElo ?? entry.startElo) - entry.startElo;

      if (eloDelta > 0) wins++;
      else if (eloDelta < 0) losses++;
      else draws++;

      winSequence.push(eloDelta > 0);

      // ELO over time
      const d = new Date(entry.match.createdAt);
      eloOverTime.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        elo: entry.endElo ?? entry.startElo,
      });

      // Wins by category
      const cat = entry.match.problem?.category ?? "unknown";
      if (eloDelta > 0) {
        winsByCategory[cat] = (winsByCategory[cat] ?? 0) + 1;
      }

      // Difficulty breakdown
      const diff = entry.match.problem?.difficulty ?? "UNKNOWN";
      difficultyCount[diff] = (difficultyCount[diff] ?? 0) + 1;
    }

    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    const categoryData = Object.entries(winsByCategory).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      wins: value,
    }));

    const difficultyData = Object.entries(difficultyCount).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

    // Rolling win rate (window of 10 matches)
    const WINDOW = 10;
    const winRateOverTime: { match: number; winRate: number }[] = [];
    for (let i = 0; i < winSequence.length; i++) {
      const start = Math.max(0, i - WINDOW + 1);
      const window = winSequence.slice(start, i + 1);
      const windowWins = window.filter(Boolean).length;
      winRateOverTime.push({
        match: i + 1,
        winRate: Math.round((windowWins / window.length) * 100),
      });
    }

    return {
      total,
      wins,
      losses,
      draws,
      winRate,
      eloOverTime,
      categoryData,
      difficultyData,
      winRateOverTime,
    };
  }, [filteredEntries, user]);

  if (!user) {
    return (
      <div className="stats-page">
        <p>Please login to view statistics.</p>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <h1 className="stats__title">Statistics</h1>

      <div className="stats__filters">
        <label className="stats__filter">
          <span className="stats__filter-label">Period</span>
          <select
            className="stats__filter-select"
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </label>
        <label className="stats__filter">
          <span className="stats__filter-label">Mode</span>
          <select
            className="stats__filter-select"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
          >
            <option value="all">All</option>
            <option value="RANKED">Ranked</option>
            <option value="FFA">FFA</option>
          </select>
        </label>
        <label className="stats__filter">
          <span className="stats__filter-label">Category</span>
          <select
            className="stats__filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          >
            <option value="all">All</option>
            <option value="Math">Math</option>
            <option value="Strings">Strings</option>
            <option value="Logic">Logic</option>
            <option value="Arrays">Arrays</option>
            <option value="Sorting">Sorting</option>
            <option value="Searching">Searching</option>
            <option value="Stacks">Stacks</option>
          </select>
        </label>
        <label className="stats__filter">
          <span className="stats__filter-label">Difficulty</span>
          <select
            className="stats__filter-select"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}
          >
            <option value="all">All</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </label>
      </div>

      <div className="stats__container">
        {loading && <div className="stats__loading">Loading statistics...</div>}

        {error && <div className="stats__error">{error}</div>}

        {!loading && !error && !stats && (
          <div className="stats__empty">No match data available</div>
        )}

        {!loading && stats && (
          <>
            {/* Summary cards */}
            <div className="stats__summary">
              <div className="stats__card">
                <span className="stats__card-value stats__card-value--accent">
                  {user.elo}
                </span>
                <span className="stats__card-label">Current ELO</span>
              </div>
              <div className="stats__card">
                <span className="stats__card-value">{stats.total}</span>
                <span className="stats__card-label">Matches</span>
              </div>
              <div className="stats__card">
                <span className="stats__card-value stats__card-value--win">
                  {stats.wins}
                </span>
                <span className="stats__card-label">Wins</span>
              </div>
              <div className="stats__card">
                <span className="stats__card-value stats__card-value--loss">
                  {stats.losses}
                </span>
                <span className="stats__card-label">Losses</span>
              </div>
              <div className="stats__card">
                <span className="stats__card-value">{stats.draws}</span>
                <span className="stats__card-label">Draws</span>
              </div>
              <div className="stats__card">
                <span className="stats__card-value stats__card-value--accent">
                  {stats.winRate}%
                </span>
                <span className="stats__card-label">Win Rate</span>
              </div>
            </div>

            {/* ELO over time */}
            <div className="stats__chart-section">
              <h2 className="stats__chart-title">ELO Over Time</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.eloOverTime}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    stroke={CHART_TEXT}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={CHART_TEXT}
                    fontSize={11}
                    tickLine={false}
                    domain={["dataMin - 50", "dataMax + 50"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: CHART_BG,
                      border: `1px solid ${CHART_GRID}`,
                      borderRadius: 6,
                      color: "#e4e0da",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="elo"
                    stroke={CHART_GOLD}
                    strokeWidth={2}
                    dot={{ r: 3, fill: CHART_GOLD }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Win rate over time */}
            {stats.winRateOverTime.length > 1 && (
              <div className="stats__chart-section">
                <h2 className="stats__chart-title">Win Rate Over Time (Rolling 10 Matches)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.winRateOverTime}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="match"
                      stroke={CHART_TEXT}
                      fontSize={11}
                      tickLine={false}
                      label={{
                        value: "Match #",
                        position: "insideBottomRight",
                        offset: -5,
                        fill: CHART_TEXT,
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      stroke={CHART_TEXT}
                      fontSize={11}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: CHART_BG,
                        border: `1px solid ${CHART_GRID}`,
                        borderRadius: 6,
                        color: "#e4e0da",
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${value}%`, "Win Rate"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="winRate"
                      stroke={CHART_GOLD}
                      strokeWidth={2}
                      dot={{ r: 2, fill: CHART_GOLD }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Wins by category */}
            {stats.categoryData.length > 0 && (
              <div className="stats__chart-section">
                <h2 className="stats__chart-title">Wins by Category</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.categoryData}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      stroke={CHART_TEXT}
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={CHART_TEXT}
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: CHART_BG,
                        border: `1px solid ${CHART_GRID}`,
                        borderRadius: 6,
                        color: "#e4e0da",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="wins" fill={CHART_WIN} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Difficulty breakdown */}
            {stats.difficultyData.length > 0 && (
              <div className="stats__chart-section">
                <h2 className="stats__chart-title">Difficulty Breakdown</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.difficultyData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={{ stroke: CHART_TEXT }}
                    >
                      {stats.difficultyData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={DIFFICULTY_COLORS[entry.name] ?? CHART_DRAW}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: CHART_BG,
                        border: `1px solid ${CHART_GRID}`,
                        borderRadius: 6,
                        color: "#e4e0da",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
