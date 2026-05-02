import { generateHistoryItemId } from '@/hooks/historyIdentity';
import { ensureUniqueTaskIds } from '@/hooks/taskIdentity';
import {
  HistoryItem,
  OrganizeApiResponse,
  PlanGroups,
  TASK_PRIORITY_VALUES,
  TASK_TIME_VALUES,
  Task,
  TaskPriority,
  TaskResult,
  TaskTime,
} from '@/types';

const TASK_TIME_SET = new Set<TaskTime>(TASK_TIME_VALUES);
const TASK_PRIORITY_SET = new Set<TaskPriority>(TASK_PRIORITY_VALUES);

const isTaskTime = (value: string): value is TaskTime => TASK_TIME_SET.has(value as TaskTime);

const isTaskPriority = (value: string): value is TaskPriority =>
  TASK_PRIORITY_SET.has(value as TaskPriority);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

type ApiTaskValue = NonNullable<OrganizeApiResponse['tasks']>[number];
type HydratedTask = Omit<Task, 'id'> & { id: string };

const sanitizePlanGroups = (value: unknown): PlanGroups => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.entries(value).reduce<PlanGroups>((groups, [key, groupValue]) => {
    if (!Array.isArray(groupValue)) {
      return groups;
    }

    const items = groupValue.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    );

    if (items.length > 0) {
      groups[key] = items;
    }

    return groups;
  }, {});
};

const sanitizeStoredTask = (value: unknown, fallbackId: string): HydratedTask | null => {
  if (!isRecord(value) || typeof value.text !== 'string') {
    return null;
  }

  const text = value.text.trim();
  if (!text) {
    return null;
  }

  const rawTime = typeof value.time === 'string' ? value.time.trim().toLowerCase() : '';
  const rawPriority =
    typeof value.priority === 'string' ? value.priority.trim().toLowerCase() : '';

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : fallbackId,
    text,
    completed: typeof value.completed === 'boolean' ? value.completed : false,
    time: isTaskTime(rawTime) ? rawTime : undefined,
    reason:
      typeof value.reason === 'string' && value.reason.trim().length > 0
        ? value.reason.trim()
        : undefined,
    priority: isTaskPriority(rawPriority) ? rawPriority : undefined,
  };
};

const sanitizeStoredTaskArray = (value: unknown, scope: string) =>
  ensureUniqueTaskIds(
    (Array.isArray(value) ? value : [])
      .map((task, index) => sanitizeStoredTask(task, `${scope}_${index.toString(36)}`))
      .filter((task): task is HydratedTask => task !== null),
    { scope }
  );

export const sanitizeStoredHistoryItem = (value: unknown): HistoryItem | null => {
  if (!isRecord(value) || typeof value.input !== 'string' || typeof value.timestamp !== 'number') {
    return null;
  }

  if (!isRecord(value.result)) {
    return null;
  }

  const tasks = sanitizeStoredTaskArray(value.result.tasks, `task-cache-${value.timestamp}`);
  if (tasks.length === 0) {
    return null;
  }

  const focusTasks = value.result.focusTasks
    ? sanitizeStoredTaskArray(value.result.focusTasks, `task-cache-focus-${value.timestamp}`)
    : undefined;

  return {
    id:
      typeof value.id === 'string' && value.id.trim()
        ? value.id.trim()
        : generateHistoryItemId('task-cache'),
    input: value.input,
    result: {
      tasks,
      ...(focusTasks && focusTasks.length > 0 ? { focusTasks } : {}),
      plan: sanitizePlanGroups(value.result.plan),
    },
    timestamp: value.timestamp,
    source: value.source === 'voice' ? 'voice' : 'text',
  };
};

const sanitizeOrganizeTask = (value: ApiTaskValue, fallbackId: string): HydratedTask | null => {
  if (!isRecord(value) || typeof value.text !== 'string') {
    return null;
  }

  const text = value.text.trim();
  if (!text) {
    return null;
  }

  const rawTime = typeof value.time === 'string' ? value.time.trim().toLowerCase() : '';
  const time = isTaskTime(rawTime) ? rawTime : undefined;
  const reason =
    typeof value.reason === 'string' && value.reason.trim() ? value.reason.trim() : undefined;

  return {
    id: fallbackId,
    text,
    completed: false,
    time,
    reason,
  };
};

const sanitizeTaskArray = (values: ApiTaskValue[] | undefined, scope: string) =>
  ensureUniqueTaskIds(
    (values ?? [])
      .map((task, index) => sanitizeOrganizeTask(task, `${scope}_${index.toString(36)}`))
      .filter((task): task is HydratedTask => task !== null),
    { scope }
  );

export const createTaskResult = (
  response: OrganizeApiResponse,
  sessionId: string
): TaskResult => {
  const plan = sanitizePlanGroups(response.plan);
  const tasks = sanitizeTaskArray(response.tasks ?? [], sessionId);

  if (tasks.length === 0) {
    throw new Error('Couldn’t make a plan from that yet.');
  }

  return {
    tasks,
    focusTasks: tasks,
    plan,
  };
};