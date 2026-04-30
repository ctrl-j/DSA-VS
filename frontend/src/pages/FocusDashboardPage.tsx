import "./FocusDashboardPage.css";
import { useState, useEffect } from "react";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const CHART_GOLD = "#CFB991";
const CHART_BG = "#111110";
const CHART_GRID = "#1e1d1b";
const CHART_TEXT = "#8a8580";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeeklyEntry {
  dayOfWeek: number;
  totalMs: number;
}

interface CategoryEntry {
  category: string;
  totalMs: number;
}

function msToHours(ms: number): number {
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

export function FocusDashboardPage() {
  const { token } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyEntry[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [weekly, categories] = await Promise.all([
          api<WeeklyEntry[]>("GET", "/api/focus/weekly", { token: token! }),
          api<CategoryEntry[]>("GET", "/api/focus/categories", { token: token! }),
        ]);
        if (!cancelled) {
          setWeeklyData(weekly);
          setCategoryData(categories);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Failed to load focus data";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const weeklyChartData = DAY_LABELS.map((label, index) => {
    const entry = weeklyData.find((w) => w.dayOfWeek === index);
    return {
      day: label,
      hours: entry ? msToHours(entry.totalMs) : 0,
    };
  });

  const radarChartData = categoryData.map((c) => ({
    category: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    hours: msToHours(c.totalMs),
  }));

  const hasData = weeklyData.length > 0 || categoryData.length > 0;

  if (!token) {
    return (
      <div className="focus-page">
        <p>Please login to view focus data.</p>
      </div>
    );
  }

  return (
    <div className="focus-page">
      <h1 className="focus__title">Focus Dashboard</h1>

      <div className="focus__container">
        {loading && <div className="focus__loading">Loading focus data...</div>}

        {error && <div className="focus__error">{error}</div>}

        {!loading && !error && !hasData && (
          <div className="focus__empty">
            No focus data yet. Practice some problems to see your patterns!
          </div>
        )}

        {!loading && !error && hasData && (
          <>
            {/* Weekly Practice Pattern */}
            <div className="focus__chart-section">
              <h2 className="focus__chart-title">Weekly Practice Pattern</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyChartData}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    stroke={CHART_TEXT}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={CHART_TEXT}
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                    label={{
                      value: "Hours",
                      angle: -90,
                      position: "insideLeft",
                      fill: CHART_TEXT,
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: CHART_BG,
                      border: `1px solid ${CHART_GRID}`,
                      borderRadius: 6,
                      color: "#e4e0da",
                      fontSize: 12,
                    }}
                    formatter={(value: unknown) => [
                      `${Number(value).toFixed(2)} hrs`,
                      "Practice Time",
                    ]}
                  />
                  <Bar
                    dataKey="hours"
                    fill={CHART_GOLD}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Strengths */}
            {radarChartData.length > 0 && (
              <div className="focus__chart-section">
                <h2 className="focus__chart-title">Category Strengths</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    data={radarChartData}
                  >
                    <PolarGrid stroke={CHART_GRID} />
                    <PolarAngleAxis
                      dataKey="category"
                      stroke={CHART_TEXT}
                      fontSize={11}
                    />
                    <PolarRadiusAxis
                      stroke={CHART_GRID}
                      fontSize={10}
                      tickFormatter={(v: number) => `${v}h`}
                    />
                    <Radar
                      name="Hours"
                      dataKey="hours"
                      stroke={CHART_GOLD}
                      fill={CHART_GOLD}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        background: CHART_BG,
                        border: `1px solid ${CHART_GRID}`,
                        borderRadius: 6,
                        color: "#e4e0da",
                        fontSize: 12,
                      }}
                      formatter={(value: unknown) => [
                        `${Number(value).toFixed(2)} hrs`,
                        "Time Spent",
                      ]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
