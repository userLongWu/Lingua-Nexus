import { useState } from "react";
import { getSourceLabel } from "../lib/cardUtils";
import { reviewCard } from "../lib/tauriClient";
import type { Card } from "../lib/types";

interface RevisoryFlowProps {
  cards: Card[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onReviewed: (cardId: string) => void;
}

const scores = [
  { value: 1, label: "Again" },
  { value: 2, label: "Hard" },
  { value: 3, label: "Good" },
  { value: 4, label: "Easy" },
];

export function RevisoryFlow({
  cards,
  loading,
  error,
  onRetry,
  onReviewed,
}: RevisoryFlowProps) {
  const [revealed, setRevealed] = useState(false);
  const [submittingScore, setSubmittingScore] = useState<number | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const activeCard = cards[0] ?? null;

  async function handleScore(score: number) {
    if (!activeCard) {
      return;
    }

    setSubmittingScore(score);
    setReviewError(null);
    try {
      await reviewCard(activeCard.id, score);
      onReviewed(activeCard.id);
      setRevealed(false);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingScore(null);
    }
  }

  if (loading) {
    return <ReviewState title="Loading review queue" />;
  }

  if (error) {
    return (
      <ReviewState title="Could not load review queue">
        <p className="text-sm text-red-600">{error}</p>
        <button className="btn-secondary mt-3" type="button" onClick={onRetry}>
          Retry
        </button>
      </ReviewState>
    );
  }

  if (!activeCard) {
    return <ReviewState title="No cards due for review" />;
  }

  return (
    <section className="panel mx-auto grid max-w-3xl gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          {getSourceLabel(activeCard.sourceType)}
        </span>
        <span className="text-sm text-slate-500">{cards.length} due</span>
      </div>
      <div className="min-h-44 rounded-lg bg-slate-50 p-6">
        <p className="text-xl font-semibold leading-relaxed text-slate-950">
          {activeCard.wordToLearn ? `${activeCard.wordToLearn}: ` : ""}
          {activeCard.originalText}
        </p>
        {revealed ? (
          <p className="mt-5 text-base text-slate-700">
            {activeCard.translatedText || activeCard.sourceTitle || "No answer text added."}
          </p>
        ) : null}
      </div>
      {reviewError ? <p className="text-sm text-red-600">{reviewError}</p> : null}
      {!revealed ? (
        <button className="btn-primary justify-self-start" type="button" onClick={() => setRevealed(true)}>
          Show answer
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {scores.map((score) => (
            <button
              key={score.value}
              className="btn-secondary"
              disabled={submittingScore !== null}
              type="button"
              onClick={() => void handleScore(score.value)}
            >
              {submittingScore === score.value ? "Saving..." : score.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="panel mx-auto max-w-3xl">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children}
    </section>
  );
}
