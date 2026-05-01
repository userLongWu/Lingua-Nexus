import { FormEvent, useState } from "react";
import { buildManualCard } from "../lib/cardUtils";
import { createCard } from "../lib/tauriClient";
import type { Card } from "../lib/types";

interface ManualCardFormProps {
  onCreated: (card: Card) => void;
}

export function ManualCardForm({ onCreated }: ManualCardFormProps) {
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!originalText.trim()) {
      setError("Original text is required.");
      return;
    }

    setLoading(true);
    try {
      const created = await createCard(
        buildManualCard({ originalText, translatedText, sourceTitle, tags }),
      );
      onCreated(created);
      setOriginalText("");
      setTranslatedText("");
      setSourceTitle("");
      setTags("");
      setMessage("Card created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel grid gap-4" onSubmit={handleSubmit}>
      <div>
        <label className="field-label" htmlFor="manual-original">
          Original text
        </label>
        <textarea
          id="manual-original"
          className="field min-h-24"
          value={originalText}
          onChange={(event) => setOriginalText(event.currentTarget.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="manual-translation">
          Translation
        </label>
        <textarea
          id="manual-translation"
          className="field min-h-20"
          value={translatedText}
          onChange={(event) => setTranslatedText(event.currentTarget.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="manual-source">
            Source title
          </label>
          <input
            id="manual-source"
            className="field"
            value={sourceTitle}
            onChange={(event) => setSourceTitle(event.currentTarget.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="manual-tags">
            Tags
          </label>
          <input
            id="manual-tags"
            className="field"
            value={tags}
            onChange={(event) => setTags(event.currentTarget.value)}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <button className="btn-primary justify-self-start" disabled={loading} type="submit">
        {loading ? "Creating..." : "Create card"}
      </button>
    </form>
  );
}
