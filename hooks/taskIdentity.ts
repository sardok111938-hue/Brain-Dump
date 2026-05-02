import { Task } from '@/types';
import { hashString, randomHex, sanitizeKey } from '@/utils/id';

type TaskIdentityCandidate = Omit<Task, 'id'> & {
  id?: string | null;
};

type EnsureUniqueTaskIdsOptions = {
  scope?: string;
};

let taskIdSequence = 0;

export const generateTaskId = (scope = 'task') => {
  const cryptoObject = globalThis.crypto;
  const sanitizedScope = sanitizeKey(scope, 'task');

  if (cryptoObject?.randomUUID) {
    return `${sanitizedScope}_${cryptoObject.randomUUID()}`;
  }

  taskIdSequence += 1;

  return [
    sanitizedScope,
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
  const scope = sanitizeKey(options.scope ?? 'task', 'task');

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
  hashString(
    `${task.text.trim().toLowerCase()}_${task.completed}_${task.priority ?? ''}`
  ),
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