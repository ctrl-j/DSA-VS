import "./LanguageStatsPage.css";
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
} from "recharts";

const CHART_GOLD = "#CFB991";
const CHART_BG = "#111110";
const CHART_GRID = "#1e1d1b";
const CHART_TEXT = "#8a8580";
const CHART_WIN = "#22c55e";
const CHART_LOSS = "#ef4444";

interface WinLossEntry {
  language: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

interface TestCaseEntry {
  language: string;
  totalPassed: number;
}

interface LanguageStatsResponse {
  winLoss: WinLossEntry[];
  testCases: TestCaseEntry[];
}

function formatLanguage(lang: string): string {
  const map: Record<string, string> = {
    python: "Python",
    cpp: "C++",
    java: "Java",
  };
  return map[lang.toLowerCase()] ?? lang;
}

export function LanguageStatsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<LanguageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const data = await api<LanguageStatsResponse>(
          "GET",
          "/api/me/language-stats",
          { token: token! }
        );
        if (!cancelled) setStats(data);
      } catch (e: unknown) {
        if (!cancelled) {
          const message =
            e instanceof Error
              ? e.message
              : "Failed to load language statistics";
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

  const hasData =
    stats && (stats.winLoss.length > 0 || stats.testCases.length > 0);

  const winLossChartData = (stats?.winLoss ?? []).map((entry) => ({
    language: formatLanguage(entry.language),
    wins: entry.wins,
    losses: entry.losses,
    winRate: entry.winRate,
  }));

  const testCaseChartData = (stats?.testCases ?? []).map((entry) => ({
    language: formatLanguage(entry.language),
    totalPassed: entry.totalPassed,
  }));

  // Build summary cards sorted by total match count
  const summaryCards = (stats?.winLoss ?? [])
    .map((wl) => {
      const tc = stats?.testCases.find(
        (t) => t.language.toLowerCase() === wl.language.toLowerCase()
      );
      return {
        language: formatLanguage(wl.language),
        matchCount: wl.total,
        wins: wl.wins,
        winRate: wl.winRate,
        totalPassed: tc?.totalPassed ?? 0,
      };
    })
    .sort((a, b) => b.matchCount - a.matchCount);

  if (!token) {
    return (
      <div className="lang-page">
        <p>Please login to view language statistics.</p>
      </div>
    );
  }

  return (
    <div className="lang-page">
      <h1 className="lang__title">Language Statistics</h1>

      <div className="lang__container">
        {loading && (
          <div className="lang__loading">Loading language statistics...</div>
        )}

        {error && <div className="lang__error">{error}</div>}

        {!loading && !error && !hasData && (
          <div className="lang__empty">
            Play some matches to see your language statistics!
          </div>
        )}

        {!loading && !error && hasData && (
          <>
            {/* Win/Loss by Language */}
            {winLossChartData.length > 0 && (
              <div className="lang__chart-section">
                <h2 className="lang__chart-title">Win/Loss by Language</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={winLossChartData}>
                    <CartesianGrid
                      stroke={CHART_GRID}
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="language"
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
                      formatter={(value: unknown, name: unknown) => {
                        const label =
                          name === "wins" ? "Wins" : name === "losses" ? "Losses" : String(name);
                        return [Number(value), label];
                      }}
                    />
                    <Bar
                      dataKey="wins"
                      fill={CHART_WIN}
                      radius={[4, 4, 0, 0]}
                      name="wins"
                    />
                    <Bar
                      dataKey="losses"
                      fill={CHART_LOSS}
                      radius={[4, 4, 0, 0]}
                      name="losses"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="lang__winrate-labels">
                  {winLossChartData.map((entry) => (
                    <span key={entry.language} className="lang__winrate-label">
                      {entry.language}: {entry.winRate}% win rate
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Test Cases Passed by Language */}
            {testCaseChartData.length > 0 && (
              <div className="lang__chart-section">
                <h2 className="lang__chart-title">
                  Test Cases Passed by Language
                </h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={testCaseChartData}>
                    <CartesianGrid
                      stroke={CHART_GRID}
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="language"
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
                      formatter={(value: unknown) => [Number(value), "Tests Passed"]}
                    />
                    <Bar
                      dataKey="totalPassed"
                      fill={CHART_GOLD}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Languages summary cards */}
            {summaryCards.length > 0 && (
              <div className="lang__chart-section">
                <h2 className="lang__chart-title">Top Languages</h2>
                <div className="lang__summary-cards">
                  {summaryCards.map((card) => (
                    <div key={card.language} className="lang__summary-card">
                      <span className="lang__summary-language">
                        {card.language}
                      </span>
                      <div className="lang__summary-stats">
                        <div className="lang__summary-stat">
                          <span className="lang__summary-value">
                            {card.matchCount}
                          </span>
                          <span className="lang__summary-label">Matches</span>
                        </div>
                        <div className="lang__summary-stat">
                          <span className="lang__summary-value lang__summary-value--win">
                            {card.wins}
                          </span>
                          <span className="lang__summary-label">Wins</span>
                        </div>
                        <div className="lang__summary-stat">
                          <span className="lang__summary-value lang__summary-value--accent">
                            {card.winRate}%
                          </span>
                          <span className="lang__summary-label">Win Rate</span>
                        </div>
                        <div className="lang__summary-stat">
                          <span className="lang__summary-value">
                            {card.totalPassed}
                          </span>
                          <span className="lang__summary-label">
                            Tests Passed
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
