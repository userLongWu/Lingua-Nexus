import { FormEvent, useEffect, useState } from "react";
import { formatDate, getSourceLabel, parseTags } from "../lib/cardUtils";
import type { Card, Review } from "../types";

interface CardDetailProps {
  card: Card | null;
  reviews: Review[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  deleting: boolean;
  mutationError: string | null;
  onSave: (card: Card) => Promise<void>;
  onDelete: (card: Card) => Promise<void>;
}

interface EditState {
  originalText: string;
  translatedText: string;
  sourceTitle: string;
  wordToLearn: string;
  pronunciation: string;
  tags: string;
  nextReviewDate: string;
}

export function CardDetail({
  card,
  reviews,
  loading,
  error,
  saving,
  deleting,
  mutationError,
  onSave,
  onDelete,
}: CardDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<EditState>(() => makeEditState(card));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setEditState(makeEditState(card));
    setValidationError(null);
    setIsEditing(false);
  }, [card]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (!card) {
      return;
    }
    if (!editState.originalText.trim()) {
      setValidationError("Original text is required.");
      return;
    }

    try {
      await onSave({
        ...card,
        originalText: editState.originalText.trim(),
        translatedText: normalizeOptional(editState.translatedText),
        sourceTitle: normalizeOptional(editState.sourceTitle),
        wordToLearn: normalizeOptional(editState.wordToLearn),
        pronunciation: normalizeOptional(editState.pronunciation),
        tags: JSON.stringify(parseTags(editState.tags)),
        nextReviewDate: normalizeOptional(editState.nextReviewDate),
      });
      setIsEditing(false);
    } catch {
      // The page owns mutation errors so the detail panel can stay focused on editing state.
    }
  }

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              {getSourceLabel(card.sourceType)}
            </span>
            <h2 className="mt-3 text-lg font-semibold text-slate-950">
              {card.wordToLearn || card.sourceTitle || "Card detail"}
            </h2>
          </div>
          <button
            className="btn-secondary"
            disabled={saving || deleting}
            type="button"
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <label className="field-label" htmlFor="detail-original">
              Original
            </label>
            <textarea
              id="detail-original"
              className="field min-h-24"
              value={editState.originalText}
              onChange={(event) =>
                setEditState((current) => ({
                  ...current,
                  originalText: event.currentTarget.value,
                }))
              }
            />
          </div>
          <div>
            <label className="field-label" htmlFor="detail-translation">
              Translation
            </label>
            <textarea
              id="detail-translation"
              className="field min-h-20"
              value={editState.translatedText}
              onChange={(event) =>
                setEditState((current) => ({
                  ...current,
                  translatedText: event.currentTarget.value,
                }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="detail-source-title"
              label="Source title"
              value={editState.sourceTitle}
              onChange={(sourceTitle) =>
                setEditState((current) => ({ ...current, sourceTitle }))
              }
            />
            <TextField
              id="detail-word"
              label="Word"
              value={editState.wordToLearn}
              onChange={(wordToLearn) =>
                setEditState((current) => ({ ...current, wordToLearn }))
              }
            />
            <TextField
              id="detail-pronunciation"
              label="Pronunciation"
              value={editState.pronunciation}
              onChange={(pronunciation) =>
                setEditState((current) => ({ ...current, pronunciation }))
              }
            />
            <TextField
              id="detail-tags"
              label="Tags"
              value={editState.tags}
              onChange={(tags) => setEditState((current) => ({ ...current, tags }))}
            />
            <TextField
              id="detail-next-review"
              label="Next review"
              type="date"
              value={editState.nextReviewDate}
              onChange={(nextReviewDate) =>
                setEditState((current) => ({ ...current, nextReviewDate }))
              }
            />
          </div>
          {validationError ? (
            <p className="text-sm text-red-600">{validationError}</p>
          ) : null}
          {mutationError ? <p className="text-sm text-red-600">{mutationError}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" disabled={saving || deleting} type="submit">
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              className="btn-secondary border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
              disabled={saving || deleting}
              type="button"
              onClick={() => void onDelete(card)}
            >
              {deleting ? "Deleting..." : "Delete card"}
            </button>
          </div>
        </form>
      ) : (
        <>
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
          {mutationError ? <p className="text-sm text-red-600">{mutationError}</p> : null}
        </>
      )}

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

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "text";
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field"
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  );
}

function makeEditState(card: Card | null): EditState {
  return {
    originalText: card?.originalText ?? "",
    translatedText: card?.translatedText ?? "",
    sourceTitle: card?.sourceTitle ?? "",
    wordToLearn: card?.wordToLearn ?? "",
    pronunciation: card?.pronunciation ?? "",
    tags: formatTagsForInput(card?.tags ?? null),
    nextReviewDate: card?.nextReviewDate?.slice(0, 10) ?? "",
  };
}

function normalizeOptional(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function formatTagsForInput(tags: string | null): string {
  if (!tags) {
    return "";
  }

  try {
    const parsed: unknown = JSON.parse(tags);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string").join(", ");
    }
  } catch {
    return tags;
  }

  return tags;
}
