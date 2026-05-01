import { describe, expect, it } from "vitest";
import { buildManualCard, filterCards, getSourceLabel } from "./cardUtils";
import type { Card } from "./types";

describe("cardUtils", () => {
  it("builds a trimmed manual text card with spaced repetition defaults", () => {
    const card = buildManualCard({
      originalText: "  I am learning Spanish.  ",
      translatedText: " Estoy aprendiendo espanol. ",
      sourceTitle: "  Notebook  ",
      tags: " grammar, daily ",
    });

    expect(card).toMatchObject({
      id: "",
      sourceType: "text",
      sourceTitle: "Notebook",
      originalText: "I am learning Spanish.",
      translatedText: "Estoy aprendiendo espanol.",
      tags: JSON.stringify(["grammar", "daily"]),
      easinessFactor: 2.5,
      repetitionNumber: 0,
      intervalDays: 0,
    });
  });

  it("filters cards by source, text, translation, word, and title", () => {
    const cards: Card[] = [
      makeCard("1", "subtitle", "A quick brown fox", "Episode 1", "zorro"),
      makeCard("2", "dictionary", "a greeting", "Dictionary", "hello"),
    ];

    expect(filterCards(cards, "fox", "all").map((card) => card.id)).toEqual(["1"]);
    expect(filterCards(cards, "hello", "dictionary").map((card) => card.id)).toEqual(["2"]);
    expect(filterCards(cards, "episode", "subtitle").map((card) => card.id)).toEqual(["1"]);
  });

  it("returns readable source labels", () => {
    expect(getSourceLabel("text")).toBe("Manual");
    expect(getSourceLabel("subtitle")).toBe("Subtitle");
    expect(getSourceLabel("dictionary")).toBe("Dictionary");
    expect(getSourceLabel("unknown")).toBe("Unknown");
  });
});

function makeCard(
  id: string,
  sourceType: Card["sourceType"],
  originalText: string,
  sourceTitle: string,
  wordToLearn?: string,
): Card {
  return {
    id,
    sourceType,
    sourceTitle,
    originalText,
    translatedText: null,
    wordToLearn: wordToLearn ?? null,
    pronunciation: null,
    imagePath: null,
    audioPath: null,
    tags: "[]",
    easinessFactor: 2.5,
    repetitionNumber: 0,
    intervalDays: 0,
    nextReviewDate: "2026-05-02",
    lastReviewDate: null,
    createdAt: "2026-05-02 00:00:00",
    extraData: null,
  };
}
