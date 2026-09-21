export type SourceType = "text" | "subtitle" | "dictionary";
export type SourceFilter = SourceType | "all";
export type PageKey = "dashboard" | "cards" | "import" | "review" | "data";

export interface Card {
  id: string;
  sourceType: SourceType;
  sourceTitle: string | null;
  originalText: string;
  translatedText: string | null;
  wordToLearn: string | null;
  pronunciation: string | null;
  imagePath: string | null;
  audioPath: string | null;
  tags: string | null;
  easinessFactor: number;
  repetitionNumber: number;
  intervalDays: number;
  nextReviewDate: string | null;
  lastReviewDate: string | null;
  createdAt: string | null;
  extraData: string | null;
}

export type CreateCardRequest = Card;
export type UpdateCardRequest = Card;

export interface CardStats {
  dueToday: number;
  total: number;
  reviewedToday: number;
  reviewDays: { date: string; count: number }[];
}

export interface Review {
  id: string;
  cardId: string;
  score: number;
  reviewDate: string;
}

export interface ManualCardInput {
  originalText: string;
  translatedText: string;
  sourceTitle: string;
  tags: string;
}

export interface AiStatus { enabled: boolean; model: string | null; message: string; }
export interface RestoreReport {
  cardsAdded: number; cardsSkipped: number; cardConflicts: number;
  reviewsAdded: number; reviewsSkipped: number; reviewConflicts: number;
}
