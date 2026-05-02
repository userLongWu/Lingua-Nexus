import { invoke } from "@tauri-apps/api/core";
import type {
  Card,
  CardStats,
  CreateCardRequest,
  Review,
  UpdateCardRequest,
} from "../types";

export function createCard(card: CreateCardRequest): Promise<Card> {
  return invoke<Card>("create_card", { card });
}

export function getCardsDueToday(): Promise<Card[]> {
  return invoke<Card[]>("get_due_cards");
}

export function getAllCards(): Promise<Card[]> {
  return invoke<Card[]>("get_all_cards");
}

export function updateCard(card: UpdateCardRequest): Promise<Card> {
  return invoke<Card>("update_card", { card });
}

export function deleteCard(cardId: string): Promise<void> {
  return invoke<void>("delete_card", { cardId });
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

export function importSrt(
  srtContent: string,
  sourceTitle: string,
): Promise<Card[]> {
  return invoke<Card[]>("import_srt", { srtContent, sourceTitle });
}

export function importFromSrt(
  srtContent: string,
  sourceTitle: string,
): Promise<Card[]> {
  return importSrt(srtContent, sourceTitle);
}

export function lookupWord(word: string): Promise<Card> {
  return invoke<Card>("lookup_word", { word });
}
