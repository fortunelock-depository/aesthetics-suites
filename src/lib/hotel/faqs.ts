// src/lib/hotel/faqs.ts

export interface IRoomFaqEntry {
  question: string;
  answer: string;
}

/**
 * Defensive parse of the RoomType.faqs Json column: anything that isn't
 * a well-formed { question, answer } entry is silently dropped, so
 * malformed data can never break a page - it just doesn't display.
 */
export function normalizeFaqs(value: unknown): IRoomFaqEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is IRoomFaqEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as { question?: unknown }).question === 'string' &&
      typeof (entry as { answer?: unknown }).answer === 'string' &&
      (entry as { question: string }).question.trim().length > 0 &&
      (entry as { answer: string }).answer.trim().length > 0,
  );
}
