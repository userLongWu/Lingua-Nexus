import { FormEvent, useState } from "react";
import { createCard, lookupWord } from "../lib/api";
import type { Card } from "../types";

interface DictionaryLookupProps {
  onCreated: (card: Card) => void;
}

export function DictionaryLookup({ onCreated }: DictionaryLookupProps) {
  const [word, setWord] = useState("");
  const [result, setResult] = useState<Card | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!word.trim()) {
      setError("Word is required.");
      return;
    }

    setLookupLoading(true);
    try {
      setResult(await lookupWord(word));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleCreate() {
    if (!result) {
      setError("Look up a word before creating a card.");
      return;
    }

    setCreateLoading(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createCard(result);
      onCreated(created);
      setMessage("Dictionary card created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <section className="panel grid gap-4">
      <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleLookup}>
        <div>
          <label className="field-label" htmlFor="dictionary-word">
            Word
          </label>
          <input
            id="dictionary-word"
            className="field"
            value={word}
            onChange={(event) => setWord(event.currentTarget.value)}
          />
        </div>
        <button
          className="btn-primary self-end"
          disabled={lookupLoading}
          type="submit"
        >
          {lookupLoading ? "Searching..." : "Lookup"}
        </button>
      </form>

      {result ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">
            {result.wordToLearn}
            {result.pronunciation ? (
              <span className="ml-2 text-slate-500">{result.pronunciation}</span>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-slate-700">{result.originalText}</p>
          <button
            className="btn-secondary mt-4"
            disabled={createLoading}
            type="button"
            onClick={handleCreate}
          >
            {createLoading ? "Creating..." : "Create card"}
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          No dictionary result loaded.
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </section>
  );
}
