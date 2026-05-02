import { useEffect, useMemo, useState } from "react";
import { CardDetail } from "../components/CardDetail";
import { CardItem } from "../components/CardItem";
import { filterCards } from "../lib/cardUtils";
import { deleteCard, getAllCards, getCardReviews, updateCard } from "../lib/api";
import type { Card, Review, SourceFilter } from "../types";

export function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const filteredCards = useMemo(
    () => filterCards(cards, query, sourceFilter),
    [cards, query, sourceFilter],
  );

  async function loadCards() {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getAllCards();
      setCards(loaded);
      setSelectedCard((current) =>
        current ? loaded.find((card) => card.id === current.id) ?? null : loaded[0] ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCards();
  }, []);

  useEffect(() => {
    if (!selectedCard) {
      setReviews([]);
      return;
    }

    setMutationError(null);
    setHistoryLoading(true);
    setHistoryError(null);
    getCardReviews(selectedCard.id)
      .then(setReviews)
      .catch((err: unknown) => {
        setReviews([]);
        setHistoryError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setHistoryLoading(false));
  }, [selectedCard]);

  async function handleSave(card: Card) {
    setSaving(true);
    setMutationError(null);
    try {
      const saved = await updateCard(card);
      setCards((currentCards) =>
        currentCards.map((currentCard) => (currentCard.id === saved.id ? saved : currentCard)),
      );
      setSelectedCard(saved);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(card: Card) {
    if (!window.confirm("Delete this card and its review history?")) {
      return;
    }

    setDeleting(true);
    setMutationError(null);
    try {
      await deleteCard(card.id);
      setCards((currentCards) => {
        const nextCards = currentCards.filter((currentCard) => currentCard.id !== card.id);
        setSelectedCard(nextCards[0] ?? null);
        return nextCards;
      });
      setReviews([]);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-shell">
      <header>
        <p className="section-kicker">Cards</p>
        <h2 className="page-title">Library</h2>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search cards"
        />
        <select
          className="field"
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.currentTarget.value as SourceFilter)}
        >
          <option value="all">All sources</option>
          <option value="text">Manual</option>
          <option value="subtitle">Subtitle</option>
          <option value="dictionary">Dictionary</option>
        </select>
      </div>

      {loading ? <StateText text="Loading cards..." /> : null}
      {error ? (
        <div className="panel">
          <p className="text-sm text-red-600">{error}</p>
          <button className="btn-secondary mt-3" type="button" onClick={() => void loadCards()}>
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !error && cards.length === 0 ? <StateText text="No cards saved." /> : null}

      {!loading && !error && cards.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3">
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  selected={selectedCard?.id === card.id}
                  onSelect={setSelectedCard}
                />
              ))
            ) : (
              <StateText text="No cards match the current filter." />
            )}
          </div>
          <CardDetail
            card={selectedCard}
            reviews={reviews}
            loading={historyLoading}
            error={historyError}
            saving={saving}
            deleting={deleting}
            mutationError={mutationError}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </div>
      ) : null}
    </div>
  );
}

function StateText({ text }: { text: string }) {
  return (
    <div className="panel text-sm text-slate-500">
      <p>{text}</p>
    </div>
  );
}
