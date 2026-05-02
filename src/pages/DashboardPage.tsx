import { useEffect, useState } from "react";
import { DueCardsList } from "../components/DueCardsList";
import { StatsCard } from "../components/StatsCard";
import { getCardStats, getCardsDueToday } from "../lib/api";
import type { Card, CardStats } from "../types";

export function DashboardPage() {
  const [stats, setStats] = useState<CardStats>({ dueToday: 0, total: 0 });
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
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard label="Due today" value={stats.dueToday} detail="Ready for review" />
        <StatsCard label="Total cards" value={stats.total} detail="Saved locally" />
      </div>
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
