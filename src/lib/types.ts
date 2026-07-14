// FitMirror shared types — used by both API routes (server) and UI (client).

export interface StyleReport {
  /** 0-100 overall fit flattering score */
  fitScore: number;
  /** e.g. "Flattering", "Relaxed", "Snug" */
  fitLabel: string;
  /** e.g. "M (Medium)" */
  sizeRecommendation: string;
  /** 0-100 color harmony with wearer's skin tone */
  colorHarmonyScore: number;
  /** e.g. "Excellent", "Good", "Contrast" */
  colorHarmonyLabel: string;
  /** e.g. "Pear", "Athletic", "Hourglass" */
  bodyType: string;
  /** e.g. ["Casual","Work","Evening"] */
  occasions: string[];
  /** short flattering notes */
  flatteringNotes: string[];
  /** styling suggestions (accessories, footwear, layering) */
  stylingTips: string[];
  /** one-paragraph plain-English summary */
  summary: string;
}

export interface TryOnResult {
  tryOnId: string;
  /** public URL path, e.g. "/uploads/abc.png" */
  resultImageUrl: string;
  report: StyleReport;
  /** additional generated variations (resultImageUrl is always variations[0]) */
  variations?: string[];
}

export interface WardrobeItemDTO {
  id: string;
  name: string;
  notes: string | null;
  personImageUrl: string | null;
  garmentImageUrl: string | null;
  resultImageUrl: string | null;
  createdAt: string;
}

export interface HistoryDTO {
  id: string;
  personImageUrl: string;
  garmentImageUrl: string;
  resultImageUrl: string | null;
  garmentName: string | null;
  report: StyleReport | null;
  createdAt: string;
}

export interface DiscoverItem {
  id: string;
  imageUrl: string;
  name: string;
  category: string;
}

export interface UsageDTO {
  used: number;
  limit: number;
  remaining: number;
  plan: 'free' | 'pro' | 'premium';
}
