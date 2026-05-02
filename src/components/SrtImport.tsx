import { FormEvent, useMemo, useState } from "react";
import { parseImportPreview } from "../lib/cardUtils";
import { importSrt } from "../lib/api";
import type { Card } from "../types";

interface SrtImportProps {
  onImported: (cards: Card[]) => void;
}

export function SrtImport({ onImported }: SrtImportProps) {
  const [sourceTitle, setSourceTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const preview = useMemo(() => parseImportPreview(content).slice(0, 5), [content]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!content.trim()) {
      setError("Paste subtitle or sentence text first.");
      return;
    }

    setLoading(true);
    try {
      const imported = await importSrt(content, sourceTitle);
      onImported(imported);
      setContent("");
      setSourceTitle("");
      setMessage(`${imported.length} cards imported.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel grid gap-4" onSubmit={handleSubmit}>
      <div>
        <label className="field-label" htmlFor="srt-source">
          Source title
        </label>
        <input
          id="srt-source"
          className="field"
          value={sourceTitle}
          onChange={(event) => setSourceTitle(event.currentTarget.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="srt-content">
          Subtitle or plain text
        </label>
        <textarea
          id="srt-content"
          className="field min-h-44"
          value={content}
          onChange={(event) => setContent(event.currentTarget.value)}
        />
      </div>
      <div className="rounded-md bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Preview
        </p>
        {preview.length > 0 ? (
          <ul className="mt-2 grid gap-2 text-sm text-slate-700">
            {preview.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No importable lines found.</p>
        )}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <button className="btn-primary justify-self-start" disabled={loading} type="submit">
        {loading ? "Importing..." : "Import cards"}
      </button>
    </form>
  );
}
