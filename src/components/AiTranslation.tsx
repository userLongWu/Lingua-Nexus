import { useEffect, useRef, useState } from "react";
import { getAiStatus, translateText } from "../lib/api";
import type { AiStatus } from "../types";

interface Props {
  sourceText: string;
  currentTranslation: string;
  disabled?: boolean;
  onApply: (translation: string) => void;
}
export function AiTranslation({ sourceText, currentTranslation, disabled = false, onApply }: Props) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const version = useRef(0);
  const pending = useRef(false);
  const latest = useRef({ sourceText, currentTranslation });
  latest.current = { sourceText, currentTranslation };
  const requested = useRef({ sourceText, currentTranslation });

  useEffect(() => {
    let active = true;
    getAiStatus().then((next) => { if (active) setStatus(next); })
      .catch(() => { if (active) setError("Could not load AI configuration. Reopen this page to retry."); });
    return () => { active = false; version.current += 1; };
  }, []);
  useEffect(() => {
    version.current += 1;
    pending.current = false;
    setLoading(false);
    setResult(null);
    setError(null);
  }, [sourceText, currentTranslation]);

  function isCurrent() {
    return latest.current.sourceText === requested.current.sourceText
      && latest.current.currentTranslation === requested.current.currentTranslation;
  }
  async function handleTranslate() {
    if (pending.current || disabled || !status?.enabled || !sourceText.trim()) return;
    const request = ++version.current;
    requested.current = { sourceText, currentTranslation };
    pending.current = true;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const answer = await translateText(sourceText);
      if (request === version.current && isCurrent()) setResult(answer);
    } catch (err) {
      if (request === version.current && isCurrent()) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (request === version.current) { pending.current = false; setLoading(false); }
    }
  }
  function apply() {
    if (!disabled && result !== null && isCurrent()) { onApply(result); setResult(null); }
  }
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        {status ? status.enabled ? `AI model: ${status.model}. Sends source text to your configured provider.` : status.message : "Loading AI configuration..."}
      </p>
      <button className="btn-secondary justify-self-start" type="button" disabled={disabled || loading || !status?.enabled || !sourceText.trim()} onClick={handleTranslate}>
        {loading ? "Translating..." : "Translate with AI"}
      </button>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {result !== null && isCurrent() ? <div className="grid gap-2">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{result}</p>
        <button className="btn-secondary justify-self-start" type="button" disabled={disabled} onClick={apply}>Apply translation</button>
        <p className="text-xs text-slate-500">Apply fills the translation field. Save the card to keep it.</p>
      </div> : null}
    </div>
  );
}
