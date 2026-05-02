import { Task } from '@/types';

type TaskIdentityCandidate = Omit<Task, 'id'> & {
  id?: string | null;
};

type EnsureUniqueTaskIdsOptions = {
  scope?: string;
};

let taskIdSequence = 0;

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

const sanitizeScope = (scope: string) =>
  scope
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'task';

export const generateTaskId = (scope = 'task') => {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.randomUUID) {
    return `${sanitizeScope(scope)}_${cryptoObject.randomUUID()}`;
  }

  taskIdSequence += 1;

  return [
    sanitizeScope(scope),
    Date.now().toString(36),
    taskIdSequence.toString(36),
    randomHex(8),
  ].join('_');
};

export const ensureUniqueTaskIds = (
  tasks: TaskIdentityCandidate[],
  options: EnsureUniqueTaskIdsOptions = {}
): Task[] => {
  const seenIds = new Set<string>();
  const scope = sanitizeScope(options.scope ?? 'task');

  return tasks.map((task, index) => {
    const originalId = typeof task.id === 'string' ? task.id.trim() : '';
    const canReuseOriginalId = originalId.length > 0 && !seenIds.has(originalId);

    if (canReuseOriginalId) {
      seenIds.add(originalId);
      return {
        ...task,
        id: originalId,
      };
    }

    const deterministicPrefix = [
      scope,
      hashString(task.text.trim().toLowerCase()),
      index.toString(36),
    ].join('_');

    let nextId = generateTaskId(deterministicPrefix);
    while (seenIds.has(nextId)) {
      nextId = generateTaskId(deterministicPrefix);
    }

    seenIds.add(nextId);

    return {
      ...task,
      id: nextId,
    };
  });
};
