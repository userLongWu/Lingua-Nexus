import { describe, expect, it } from "vitest";
import { buildManualCard, filterCards, getSourceLabel, getReviewText, makeCard as createCard, parseImportPreview } from "./cardUtils";
import type { Card } from "../types";

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


describe("import preview", () => {
  it("keeps one card per nonempty plain-text line without splitting punctuation", () => {
    expect(parseImportPreview("Dr. Smith paid 3.14... Really? Yes!\r\n\r\n42\rA --> B")).toEqual([
      "Dr. Smith paid 3.14... Really? Yes!", "42", "A --> B",
    ]);
  });

  it("keeps numeric dialogue and multiline cues while removing only SRT metadata", () => {
    expect(parseImportPreview("1\r\n00:00:01,000 --> 00:00:03,000\r\n42\r\nDr. Smith... 3.14\r\n \r\n2\r\n00:00:04,000 --> 00:00:06,000\r\n2026\r\n")).toEqual([
      "42 Dr. Smith... 3.14", "2026",
    ]);
  });

  it("returns no cards for timing-only cues", () => {
    expect(parseImportPreview("1\n00:00:01,000 --> 00:00:03,000\n\n2\n00:00:04,000 --> 00:00:06,000")).toEqual([]);
  });
});


describe("review sides", () => {
  it("puts the legacy dictionary definition and optional translation on the back", () => {
    expect(getReviewText(createCard("dictionary", "a friendly greeting", {
      wordToLearn: "hello", translatedText: "你好",
    }))).toEqual({ front: "hello", back: "a friendly greeting\n\n你好" });
  });

  it("keeps text card fronts and translations and does not mistake source titles for answers", () => {
    expect(getReviewText(createCard("text", "Hello", { translatedText: "你好" })))
      .toEqual({ front: "Hello", back: "你好" });
    expect(getReviewText(createCard("subtitle", "Hello", { sourceTitle: "Episode 1" })))
      .toEqual({ front: "Hello", back: "No answer text added." });
  });

  it("retains readable original text if a legacy dictionary card has no word", () => {
    expect(getReviewText(createCard("dictionary", "hello", { translatedText: "a greeting" })))
      .toEqual({ front: "hello", back: "a greeting" });
  });
});
