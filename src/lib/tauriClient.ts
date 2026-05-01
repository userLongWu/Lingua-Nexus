import { invoke } from "@tauri-apps/api/core";
import type { Card, CardStats, Review } from "./types";

export function createCard(card: Card): Promise<Card> {
  return invoke<Card>("create_card", { card });
}

export function getCardsDueToday(): Promise<Card[]> {
  return invoke<Card[]>("get_cards_due_today");
}

export function getAllCards(): Promise<Card[]> {
  return invoke<Card[]>("get_all_cards");
}

export function getCardStats(): Promise<CardStats> {
  return invoke<CardStats>("get_card_stats");
}

export function getCardReviews(cardId: string): Promise<Review[]> {
  return invoke<Review[]>("get_card_reviews", { cardId });
}

export function reviewCard(cardId: string, score: number): Promise<void> {
  return invoke<void>("review_card", { cardId, score });
}

export function importFromSrt(
  srtContent: string,
  sourceTitle: string,
): Promise<Card[]> {
  return invoke<Card[]>("import_from_srt", { srtContent, sourceTitle });
}

export function lookupWord(word: string): Promise<Card> {
  return invoke<Card>("lookup_word", { word });
}
