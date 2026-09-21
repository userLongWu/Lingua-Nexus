import { useEffect, useRef, useState } from "react";
import { exportBackup, getAiStatus, restoreBackup } from "../lib/api";
import type { AiStatus, RestoreReport } from "../types";

export function DataPage() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState<"export" | "restore" | null>(null);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);
  useEffect(() => {
    let active = true;
    getAiStatus().then((value) => { if (active) setStatus(value); })
      .catch(() => { if (active) setError("Could not load AI configuration. Reopen Data to retry."); });
    return () => { active = false; };
  }, []);
  async function handleExport() {
    if (pending.current) return;
    pending.current = true; setBusy("export"); setError(null); setPath(null); setReport(null);
    try { setPath(await exportBackup()); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { pending.current = false; setBusy(null); }
  }
  async function handleRestore(file: File | undefined) {
    if (!file || pending.current) return;
    if (file.size > 20 * 1024 * 1024) { setError("Backup must be 20 MiB or smaller."); return; }
    pending.current = true; setBusy("restore"); setError(null); setPath(null); setReport(null);
    try { setReport(await restoreBackup(await file.text())); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { pending.current = false; setBusy(null); }
  }
  return <div className="page-shell">
    <header><p className="section-kicker">Data & settings</p><h2 className="page-title">Your local library</h2></header>
    <section className="panel grid gap-3">
      <h3 className="section-title">AI translation</h3>
      <p className="text-sm text-slate-700">{status ? `${status.enabled ? `Configured · ${status.model}` : "Not configured"}. ${status.message}` : "Loading configuration..."}</p>
      <p className="text-sm text-slate-500">Configure AI_BASE_URL, AI_MODEL and AI_API_KEY in .env.local, then restart the app. API keys stay in the desktop backend and are excluded from backups.</p>
    </section>
    <section className="panel grid gap-3">
      <h3 className="section-title">Backup & restore</h3>
      <p className="text-sm text-slate-600">Export all cards and review history to a new JSON file in Downloads. Restore merges records; existing IDs are never overwritten. History belonging to a conflicting card is skipped.</p>
      <button className="btn-primary justify-self-start" type="button" disabled={busy !== null} onClick={handleExport}>{busy === "export" ? "Exporting..." : "Export backup"}</button>
      <label className="field-label" htmlFor="restore-backup">Restore a backup (JSON, up to 20 MiB)</label>
      <input id="restore-backup" className="field" type="file" accept=".json,application/json" disabled={busy !== null} onChange={(event) => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void handleRestore(file);
      }} />
      {busy === "restore" ? <p role="status">Validating and restoring...</p> : null}
      {path ? <p role="status" className="break-all text-sm text-emerald-700">Backup saved: {path}</p> : null}
      {report ? <div role="status" className="text-sm text-emerald-700">
        <p>Cards: {report.cardsAdded} added, {report.cardsSkipped} skipped ({report.cardConflicts} conflicts).</p>
        <p>Reviews: {report.reviewsAdded} added, {report.reviewsSkipped} skipped ({report.reviewConflicts} ID conflicts).</p>
        <p>Existing data was preserved. Open Dashboard or Cards to see restored records.</p>
      </div> : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </section>
  </div>;
}
