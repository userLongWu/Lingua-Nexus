import { FormEvent, useEffect, useRef, useState } from "react";
import { createCard, lookupWord } from "../lib/api";
import type { Card } from "../types";

interface DictionaryLookupProps {
  onCreated: (card: Card) => void;
}

export function DictionaryLookup({ onCreated }: DictionaryLookupProps) {
  const lookupVersion = useRef(0);
  const lookupPending = useRef(false);
  const createPending = useRef(false);
  const savedResult = useRef(false);
  const [saved, setSaved] = useState(false);
  const [word, setWord] = useState("");
  const [result, setResult] = useState<Card | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => () => { lookupVersion.current += 1; }, []);

  function changeWord(value: string) {
    if (createPending.current) return;
    lookupVersion.current += 1;
    lookupPending.current = false;
    savedResult.current = false;
    setWord(value);
    setResult(null);
    setSaved(false);
    setLookupLoading(false);
    setError(null);
    setMessage(null);
  }

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    if (lookupPending.current || createPending.current) return;
    const version = ++lookupVersion.current;
    setResult(null);
    setError(null);
    setMessage(null);
    setSaved(false);
    savedResult.current = false;

    if (!word.trim()) {
      setError("Word is required.");
      return;
    }

    lookupPending.current = true;
    setLookupLoading(true);
    try {
      const found = await lookupWord(word.trim());
      if (version === lookupVersion.current) setResult(found);
    } catch (err) {
      if (version === lookupVersion.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (version === lookupVersion.current) {
        lookupPending.current = false;
        setLookupLoading(false);
      }
    }
  }

  async function handleCreate() {
    if (createPending.current || lookupPending.current || savedResult.current) return;
    if (!result) {
      setError("Look up a word before creating a card.");
      return;
    }

    createPending.current = true;
    setCreateLoading(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createCard(result);
      savedResult.current = true;
      setSaved(true);
      onCreated(created);
      setMessage("Dictionary card created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      createPending.current = false;
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
            disabled={createLoading}
            onChange={(event) => changeWord(event.currentTarget.value)}
          />
        </div>
        <button
          className="btn-primary self-end"
          disabled={lookupLoading || createLoading}
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
            disabled={createLoading || lookupLoading || saved}
            type="button"
            onClick={handleCreate}
          >
            {createLoading ? "Creating..." : saved ? "Card created" : "Create card"}
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
