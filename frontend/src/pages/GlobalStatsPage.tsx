import "./GlobalStatsPage.css";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CHART_GOLD = "#CFB991";
const CHART_BG = "#111110";
const CHART_GRID = "#1e1d1b";
const CHART_TEXT = "#8a8580";
const CHART_WIN = "#22c55e";

type SolveTimeBucket = { bucket: string; count: number };
type CategorySuccess = {
  category: string;
  totalAttempts: number;
  successCount: number;
  successRate: number;
};
type MedianEloResponse = { medianElo: number };

type CategoryFilter =
  | ""
  | "arrays"
  | "strings"
  | "logic"
  | "math"
  | "sorting"
  | "searching"
  | "stacks";

export function GlobalStatsPage() {
  const { token } = useAuth();

  // Solve time distribution
  const [solveTimes, setSolveTimes] = useState<SolveTimeBucket[]>([]);
  const [solveTimesLoading, setSolveTimesLoading] = useState(true);
  const [solveTimesError, setSolveTimesError] = useState<string | null>(null);

  // Category success rate
  const [categoryData, setCategoryData] = useState<CategorySuccess[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("");

  // Median ELO
  const [medianElo, setMedianElo] = useState<number | null>(null);
  const [medianLoading, setMedianLoading] = useState(true);
  const [medianError, setMedianError] = useState<string | null>(null);

  // Fetch solve time distribution
  useEffect(() => {
    setSolveTimesLoading(true);
    setSolveTimesError(null);
    api<SolveTimeBucket[]>("GET", "/api/stats/solve-times", {
      token: token ?? undefined,
    })
      .then((data) => setSolveTimes(data))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load solve times";
        setSolveTimesError(message);
      })
      .finally(() => setSolveTimesLoading(false));
  }, [token]);

  // Fetch category success rate
  const fetchCategorySuccess = useCallback(() => {
    setCategoryLoading(true);
    setCategoryError(null);
    const query: Record<string, string | number | undefined> = {};
    if (categoryFilter) {
      query.category = categoryFilter;
    }
    api<CategorySuccess[]>("GET", "/api/stats/category-success", {
      token: token ?? undefined,
      query,
    })
      .then((data) => setCategoryData(data))
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load category success data";
        setCategoryError(message);
      })
      .finally(() => setCategoryLoading(false));
  }, [token, categoryFilter]);

  useEffect(() => {
    fetchCategorySuccess();
  }, [fetchCategorySuccess]);

  // Fetch median ELO
  useEffect(() => {
    setMedianLoading(true);
    setMedianError(null);
    api<MedianEloResponse>("GET", "/api/stats/median-elo", {
      token: token ?? undefined,
    })
      .then((data) => setMedianElo(data.medianElo))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load median ELO";
        setMedianError(message);
      })
      .finally(() => setMedianLoading(false));
  }, [token]);

  return (
    <div className="gstats-page">
      <h1 className="gstats__title">Global Statistics</h1>

      <div className="gstats__container">
        {/* Section 1: Solve Time Distribution */}
        <div className="gstats__section">
          <h2 className="gstats__section-title">
            Solve Time Distribution (Hard Problems)
          </h2>
          {solveTimesLoading && (
            <div className="gstats__loading">Loading solve times...</div>
          )}
          {solveTimesError && (
            <div className="gstats__error">{solveTimesError}</div>
          )}
          {!solveTimesLoading && !solveTimesError && solveTimes.length === 0 && (
            <div className="gstats__empty">No solve time data available</div>
          )}
          {!solveTimesLoading && !solveTimesError && solveTimes.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={solveTimes}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis
                  dataKey="bucket"
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
                <Bar
                  dataKey="count"
                  fill={CHART_GOLD}
                  radius={[4, 4, 0, 0]}
                  name="Solves"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Section 2: Success Rate by Category */}
        <div className="gstats__section">
          <div className="gstats__section-header">
            <h2 className="gstats__section-title">Success Rate by Category</h2>
            <label className="gstats__filter">
              <span className="gstats__filter-label">Category</span>
              <select
                className="gstats__filter-select"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as CategoryFilter)
                }
              >
                <option value="">All Categories</option>
                <option value="arrays">Arrays</option>
                <option value="strings">Strings</option>
                <option value="logic">Logic</option>
                <option value="math">Math</option>
                <option value="sorting">Sorting</option>
                <option value="searching">Searching</option>
                <option value="stacks">Stacks</option>
              </select>
            </label>
          </div>
          {categoryLoading && (
            <div className="gstats__loading">Loading category data...</div>
          )}
          {categoryError && (
            <div className="gstats__error">{categoryError}</div>
          )}
          {!categoryLoading && !categoryError && categoryData.length === 0 && (
            <div className="gstats__empty">No category data available</div>
          )}
          {!categoryLoading && !categoryError && categoryData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  stroke={CHART_TEXT}
                  fontSize={11}
                  tickLine={false}
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [
                    `${Number(value).toFixed(1)}%`,
                    "Success Rate",
                  ]}
                />
                <Bar
                  dataKey="successRate"
                  fill={CHART_WIN}
                  radius={[4, 4, 0, 0]}
                  name="Success Rate"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Section 3: Median Elo */}
        <div className="gstats__section gstats__section--centered">
          <h2 className="gstats__section-title">Median Elo</h2>
          {medianLoading && (
            <div className="gstats__loading">Loading median ELO...</div>
          )}
          {medianError && <div className="gstats__error">{medianError}</div>}
          {!medianLoading && !medianError && medianElo !== null && (
            <div className="gstats__stat-card">
              <span className="gstats__stat-value">{medianElo}</span>
              <span className="gstats__stat-subtitle">across all players</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
