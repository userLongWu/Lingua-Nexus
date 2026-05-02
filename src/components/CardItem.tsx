import { formatDate, getSourceLabel } from "../lib/cardUtils";
import type { Card } from "../types";

interface CardItemProps {
  card: Card;
  selected?: boolean;
  onSelect?: (card: Card) => void;
}

export function CardItem({ card, selected = false, onSelect }: CardItemProps) {
  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          {getSourceLabel(card.sourceType)}
        </span>
        <span className="text-xs text-slate-500">
          Due {formatDate(card.nextReviewDate)}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-950">
        {card.wordToLearn ? `${card.wordToLearn}: ` : ""}
        {card.originalText}
      </p>
      <p className="mt-2 line-clamp-1 text-xs text-slate-500">
        {card.translatedText || card.sourceTitle || "No translation added"}
      </p>
    </>
  );

  if (!onSelect) {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        {content}
      </article>
    );
  }

  return (
    <button
      className={`w-full rounded-lg border p-4 text-left transition ${
        selected
          ? "border-slate-950 bg-slate-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
      type="button"
      onClick={() => onSelect(card)}
    >
      {content}
    </button>
  );
}
