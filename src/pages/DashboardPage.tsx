import { useEffect, useState } from "react";
import { DueCardsList } from "../components/DueCardsList";
import { StatsCard } from "../components/StatsCard";
import { getCardStats, getCardsDueToday } from "../lib/api";
import type { Card, CardStats } from "../types";

export function DashboardPage() {
  const [stats, setStats] = useState<CardStats>({ dueToday: 0, total: 0, reviewedToday: 0, reviewDays: [] });
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [nextStats, nextDueCards] = await Promise.all([
        getCardStats(),
        getCardsDueToday(),
      ]);
      setStats(nextStats);
      setDueCards(nextDueCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <div className="page-shell">
      <header>
        <p className="section-kicker">Dashboard</p>
        <h2 className="page-title">Today</h2>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Due today" value={stats.dueToday} detail="Ready for review" />
        <StatsCard label="Reviews today" value={stats.reviewedToday} detail="Completed review actions" />
        <StatsCard label="Total cards" value={stats.total} detail="Saved locally" />
      </div>
      <section className="panel">
        <h3 className="section-title">Last 7 days</h3>
        {loading ? <p className="text-sm text-slate-500">Loading review activity...</p> : error ? <p className="text-sm text-slate-500">Review activity could not be loaded.</p> : <div className="mt-3 grid grid-cols-7 gap-2">
          {stats.reviewDays.map((day) => <div key={day.date} className="rounded bg-slate-50 p-2 text-center">
            <p className="text-xs text-slate-500">{day.date.slice(5)}</p><p className="mt-2 font-semibold">{day.count}</p>
          </div>)}
        </div>}
        <p className="mt-2 text-xs text-slate-500">Review actions per local calendar day.</p>
      </section>
      <section>
        <h3 className="section-title">Due cards</h3>
        <DueCardsList
          cards={dueCards}
          loading={loading}
          error={error}
          onRetry={() => void loadDashboard()}
        />
      </section>
    </div>
  );
}
