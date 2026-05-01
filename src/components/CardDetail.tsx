import { formatDate, getSourceLabel } from "../lib/cardUtils";
import type { Card, Review } from "../lib/types";

interface CardDetailProps {
  card: Card | null;
  reviews: Review[];
  loading: boolean;
  error: string | null;
}

export function CardDetail({ card, reviews, loading, error }: CardDetailProps) {
  if (!card) {
    return (
      <section className="panel text-sm text-slate-500">
        Select a card to view details.
      </section>
    );
  }

  return (
    <section className="panel grid gap-5">
      <div>
        <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          {getSourceLabel(card.sourceType)}
        </span>
        <h2 className="mt-3 text-lg font-semibold text-slate-950">
          {card.wordToLearn || card.sourceTitle || "Card detail"}
        </h2>
      </div>
      <div>
        <p className="field-label">Original</p>
        <p className="text-sm text-slate-800">{card.originalText}</p>
      </div>
      <div>
        <p className="field-label">Translation</p>
        <p className="text-sm text-slate-800">
          {card.translatedText || "No translation added."}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Ease</dt>
          <dd className="font-medium text-slate-950">{card.easinessFactor}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Repetitions</dt>
          <dd className="font-medium text-slate-950">{card.repetitionNumber}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Interval</dt>
          <dd className="font-medium text-slate-950">{card.intervalDays} days</dd>
        </div>
        <div>
          <dt className="text-slate-500">Next review</dt>
          <dd className="font-medium text-slate-950">
            {formatDate(card.nextReviewDate)}
          </dd>
        </div>
      </dl>
      <div>
        <p className="field-label">Review history</p>
        {loading ? <p className="text-sm text-slate-500">Loading history...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && !error && reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet.</p>
        ) : null}
        {!loading && !error && reviews.length > 0 ? (
          <ul className="mt-2 grid gap-2 text-sm text-slate-700">
            {reviews.map((review) => (
              <li key={review.id} className="flex justify-between rounded bg-slate-50 p-2">
                <span>{formatDate(review.reviewDate)}</span>
                <span className="font-medium">Score {review.score}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
