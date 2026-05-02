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

export function parseImportPreview(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.includes("-->")) {
    return normalized
      .split(/\n{2,}/)
      .map((block) =>
        block
          .split("\n")
          .map((line) => line.trim())
          .filter(
            (line) =>
              line.length > 0 && !/^\d+$/.test(line) && !line.includes("-->"),
          )
          .join(" "),
      )
      .map(normalizeSpaces)
      .filter(Boolean);
  }

  return normalized
    .split("\n")
    .flatMap(splitPlainTextLine)
    .map(normalizeSpaces)
    .filter(Boolean);
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

function splitPlainTextLine(line: string): string[] {
  const sentences: string[] = [];
  let current = "";

  for (const character of line) {
    current += character;
    if ([".", "!", "?", "。", "！", "？"].includes(character)) {
      const sentence = current.trim();
      if (sentence) {
        sentences.push(sentence);
      }
      current = "";
    }
  }

  const remaining = current.trim();
  if (remaining) {
    sentences.push(remaining);
  }

  return sentences;
}
