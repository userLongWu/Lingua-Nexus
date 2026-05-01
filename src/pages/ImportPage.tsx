import { useState } from "react";
import { DictionaryLookup } from "../components/DictionaryLookup";
import { ManualCardForm } from "../components/ManualCardForm";
import { SrtImport } from "../components/SrtImport";
import type { Card } from "../lib/types";

export function ImportPage() {
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  function handleCreated(card: Card) {
    setLastCreated(card.wordToLearn || card.originalText);
  }

  function handleImported(cards: Card[]) {
    setLastCreated(`${cards.length} subtitle cards`);
  }

  return (
    <div className="page-shell">
      <header>
        <p className="section-kicker">Import</p>
        <h2 className="page-title">Create cards</h2>
        {lastCreated ? (
          <p className="mt-2 text-sm text-emerald-700">Saved {lastCreated}.</p>
        ) : null}
      </header>
      <section>
        <h3 className="section-title">Manual card</h3>
        <ManualCardForm onCreated={handleCreated} />
      </section>
      <section>
        <h3 className="section-title">Subtitles</h3>
        <SrtImport onImported={handleImported} />
      </section>
      <section>
        <h3 className="section-title">Dictionary</h3>
        <DictionaryLookup onCreated={handleCreated} />
      </section>
    </div>
  );
}
