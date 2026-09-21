import type { Card, ManualCardInput, SourceFilter, SourceType } from "../types";

export function buildManualCard(input: ManualCardInput): Card {
  return makeCard("text", input.originalText, {
    sourceTitle: normalizeOptional(input.sourceTitle),
    translatedText: normalizeOptional(input.translatedText),
    tags: JSON.stringify(parseTags(input.tags)),
  });
}

export function makeCard(
  sourceType: SourceType,
  originalText: string,
  overrides: Partial<Card> = {},
): Card {
  return {
    id: "",
    sourceType,
    sourceTitle: null,
    originalText: originalText.trim(),
    translatedText: null,
    wordToLearn: null,
    pronunciation: null,
    imagePath: null,
    audioPath: null,
    tags: "[]",
    easinessFactor: 2.5,
    repetitionNumber: 0,
    intervalDays: 0,
    nextReviewDate: null,
    lastReviewDate: null,
    createdAt: null,
    extraData: null,
    ...overrides,
  };
}

export function filterCards(cards: Card[], query: string, source: SourceFilter): Card[] {
  const normalizedQuery = query.trim().toLowerCase();

  return cards.filter((card) => {
    const sourceMatches = source === "all" || card.sourceType === source;
    if (!sourceMatches) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      card.originalText,
      card.translatedText,
      card.wordToLearn,
      card.sourceTitle,
      card.tags,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });
}

export function getSourceLabel(sourceType: string): string {
  switch (sourceType) {
    case "text":
      return "Manual";
    case "subtitle":
      return "Subtitle";
    case "dictionary":
      return "Dictionary";
    default:
      return "Unknown";
  }
}

// Existing dictionary cards store their definition in originalText.
export function getReviewText(card: Card): { front: string; back: string } {
  if (card.sourceType === "dictionary" && card.wordToLearn?.trim()) {
    return {
      front: card.wordToLearn,
      back: [card.originalText, card.translatedText].filter(Boolean).join("\n\n"),
    };
  }
  return {
    front: card.originalText,
    back: card.translatedText || "No answer text added.",
  };
}

export function parseImportPreview(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const isTimingLine = (line: string) =>
    /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,.]\d{3}(?:\s|$)/.test(line.trim());

  if (normalized.split("\n").some(isTimingLine)) {
    const cards: string[] = [];
    let cue: string[] = [];
    let inCue = false;
    for (const line of [...normalized.split("\n"), ""]) {
      if (!line.trim()) {
        const text = normalizeSpaces(cue.join(" "));
        if (text) cards.push(text);
        cue = [];
        inCue = false;
      } else if (isTimingLine(line)) {
        inCue = true;
      } else if (inCue) {
        // Numeric text after a timestamp is dialogue, not a cue index.
        cue.push(line);
      }
    }
    return cards;
  }

  return normalized.split("\n").map(normalizeSpaces).filter(Boolean);
}

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "Not scheduled";
  }

  return value.slice(0, 10);
}

function normalizeOptional(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
