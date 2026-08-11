// src/lib/hotel/faqs.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeFaqs } from './faqs';

describe('normalizeFaqs', () => {
  it('returns [] for anything that is not an array', () => {
    expect(normalizeFaqs(null)).toEqual([]);
    expect(normalizeFaqs(undefined)).toEqual([]);
    expect(normalizeFaqs('faqs')).toEqual([]);
    expect(normalizeFaqs({ question: 'q', answer: 'a' })).toEqual([]);
    expect(normalizeFaqs(42)).toEqual([]);
  });

  it('keeps well-formed entries', () => {
    const faqs = [{ question: 'Check-in time?', answer: 'From 2pm.' }];
    expect(normalizeFaqs(faqs)).toEqual(faqs);
  });

  it('silently drops malformed entries instead of breaking', () => {
    const result = normalizeFaqs([
      { question: 'Valid?', answer: 'Yes.' },
      { question: 'Missing answer' },
      { answer: 'Missing question' },
      { question: 42, answer: 'Wrong type' },
      { question: '   ', answer: 'Blank question' },
      { question: 'Blank answer', answer: '' },
      null,
      'not an object',
    ]);
    expect(result).toEqual([{ question: 'Valid?', answer: 'Yes.' }]);
  });
});
