import { useEffect, useState } from "react";
import { RevisoryFlow } from "../components/RevisoryFlow";
import { getCardsDueToday } from "../lib/api";
import type { Card } from "../types";

export function ReviewPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReviewQueue() {
    setLoading(true);
    setError(null);
    try {
      setCards(await getCardsDueToday());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviewQueue();
  }, []);

  return (
    <div className="page-shell">
      <header>
        <p className="section-kicker">Review</p>
        <h2 className="page-title">Queue</h2>
      </header>
      <RevisoryFlow
        cards={cards}
        loading={loading}
        error={error}
        onRetry={() => void loadReviewQueue()}
        onReviewed={(cardId) =>
          setCards((currentCards) => currentCards.filter((card) => card.id !== cardId))
        }
      />
    </div>
  );
}
