import { HistoryItem } from '@/types';

let historyIdSequence = 0;

const randomHex = (size: number) => {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const bytes = new Uint8Array(size);
    cryptoObject.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return Array.from({ length: size }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');
};

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

const sanitizeId = (value?: string) => value?.trim() ?? '';

export const generateHistoryItemId = (seed = 'history') => {
  const cryptoObject = globalThis.crypto;
  const normalizedSeed = seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'history';

  if (cryptoObject?.randomUUID) {
    return `${normalizedSeed}_${cryptoObject.randomUUID()}`;
  }

  historyIdSequence += 1;

  return [
    normalizedSeed,
    Date.now().toString(36),
    historyIdSequence.toString(36),
    randomHex(8),
  ].join('_');
};

export const ensureUniqueHistoryIds = (history: HistoryItem[]): HistoryItem[] => {
  const seenIds = new Set<string>();

  return history.map((item) => {
    const originalId = sanitizeId(item.id);
    const canReuseOriginalId = originalId.length > 0 && !seenIds.has(originalId);

    if (canReuseOriginalId) {
      seenIds.add(originalId);
      return {
        ...item,
        id: originalId,
      };
    }

    const deterministicSeed = [
      'history',
      item.timestamp.toString(36),
      hashString(item.input.trim().toLowerCase()),
    ].join('_');

    let nextId = generateHistoryItemId(deterministicSeed);
    while (seenIds.has(nextId)) {
      nextId = generateHistoryItemId(deterministicSeed);
    }

    seenIds.add(nextId);

    return {
      ...item,
      id: nextId,
    };
  });
};
