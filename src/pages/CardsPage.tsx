import { useEffect, useMemo, useRef, useState } from "react";
import { CardDetail } from "../components/CardDetail";
import { CardItem } from "../components/CardItem";
import { filterCards } from "../lib/cardUtils";
import { deleteCard, getAllCards, getCardReviews, updateCard } from "../lib/api";
import type { Card, Review, SourceFilter } from "../types";

export function CardsPage() {
  const mutationPending = useRef(false);
  const selectedId = useRef<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyCardId, setHistoryCardId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  selectedId.current = selectedCard?.id ?? null;
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
    let active = true;
    const cardId = selectedCard?.id ?? null;
    setReviews([]);
    setHistoryCardId(cardId);
    setMutationError(null);
    setHistoryError(null);
    setHistoryLoading(cardId !== null);
    if (cardId === null) return;

    getCardReviews(cardId)
      .then((loaded) => { if (active) setReviews(loaded); })
      .catch((err: unknown) => {
        if (active) setHistoryError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [selectedCard?.id]);

  function selectCard(card: Card) {
    selectedId.current = card.id;
    setMutationError(null);
    setSelectedCard(card);
  }

  async function handleSave(card: Card) {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setSaving(true);
    setMutationError(null);
    try {
      const saved = await updateCard(card);
      setCards((currentCards) =>
        currentCards.map((currentCard) => (currentCard.id === saved.id ? saved : currentCard)),
      );
      setSelectedCard((current) => current?.id === saved.id ? saved : current);
    } catch (err) {
      if (selectedId.current === card.id) {
        setMutationError(err instanceof Error ? err.message : String(err));
      }
      throw err;
    } finally {
      mutationPending.current = false;
      setSaving(false);
    }
  }

  async function handleDelete(card: Card) {
    if (mutationPending.current || !window.confirm("Delete this card and its review history?")) return;
    mutationPending.current = true;
    setDeleting(true);
    setMutationError(null);
    try {
      await deleteCard(card.id);
      setCards((currentCards) => currentCards.filter((currentCard) => currentCard.id !== card.id));
      setSelectedCard((current) => current?.id === card.id ? null : current);
    } catch (err) {
      if (selectedId.current === card.id) {
        setMutationError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      mutationPending.current = false;
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
                  onSelect={selectCard}
                />
              ))
            ) : (
              <StateText text="No cards match the current filter." />
            )}
          </div>
          <CardDetail
            key={selectedCard?.id ?? "empty"}
            card={selectedCard}
            reviews={historyCardId === selectedCard?.id ? reviews : []}
            loading={historyLoading || historyCardId !== selectedCard?.id}
            error={historyCardId === selectedCard?.id ? historyError : null}
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
