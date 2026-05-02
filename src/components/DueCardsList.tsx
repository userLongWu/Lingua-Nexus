import type { Card } from "../types";
import { CardItem } from "./CardItem";

interface DueCardsListProps {
  cards: Card[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function DueCardsList({ cards, loading, error, onRetry }: DueCardsListProps) {
  if (loading) {
    return <StatePanel title="Loading due cards" />;
  }

  if (error) {
    return (
      <StatePanel title="Could not load due cards">
        <p className="text-sm text-red-600">{error}</p>
        <button className="btn-secondary mt-3" type="button" onClick={onRetry}>
          Retry
        </button>
      </StatePanel>
    );
  }

  if (cards.length === 0) {
    return <StatePanel title="No cards due today" />;
  }

  return (
    <div className="grid gap-3">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  );
}

function StatePanel({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children}
    </div>
  );
}
