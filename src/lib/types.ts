export type SourceType = "text" | "subtitle" | "dictionary";
export type SourceFilter = SourceType | "all";
export type PageKey = "dashboard" | "cards" | "import" | "review";

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

export interface CardStats {
  dueToday: number;
  total: number;
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
