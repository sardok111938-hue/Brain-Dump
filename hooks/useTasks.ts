import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { generateHistoryItemId } from '@/hooks/historyIdentity';
import { isBackendUnavailableError, organizeTextApi } from '@/services/api';
import { ensureUniqueTaskIds, generateTaskId } from '@/hooks/taskIdentity';
import {
  HistoryItem,
  InputSource,
  OrganizeMode,
  OrganizeApiResponse,
  PlanGroups,
  TASK_PRIORITY_VALUES,
  TASK_TIME_VALUES,
  Task,
  TaskPriority,
  TaskTime,
  TaskResult,
} from '@/types';

type UseTasksOptions = {
  saveHistoryEntry: (entry: HistoryItem) => Promise<void>;
  selectedHistoryEntry: HistoryItem | null;
  latestCachedSession: HistoryItem | null;
  selectionKey?: string | null;
};

const COMPLETION_MESSAGES = [
  'Nice. Next up.',
  'Good progress.',
  'Keep it moving.',
  'That’s done. Continue.',
  'One less thing.',
  'Clear. Next.',
];

const OFFLINE_FALLBACK_MESSAGE = 'Offline right now. Showing your latest saved plan.';
const SAVE_WARNING_MESSAGE = 'Plan ready. Couldn’t save it right now.';
const CURRENT_TASKS_KEY = 'brainDumpTasks';
const LATEST_SESSION_CACHE_KEY = 'brainDumpLatestSession';

const TASK_TIME_SET = new Set<TaskTime>(TASK_TIME_VALUES);
const TASK_PRIORITY_SET = new Set<TaskPriority>(TASK_PRIORITY_VALUES);
const isTaskTime = (value: string): value is TaskTime => TASK_TIME_SET.has(value as TaskTime);
const isTaskPriority = (value: string): value is TaskPriority =>
  TASK_PRIORITY_SET.has(value as TaskPriority);

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

type ApiTaskValue = NonNullable<OrganizeApiResponse['tasks']>[number];
type HydratedTask = Omit<Task, 'id'> & { id: string };

const sanitizeStoredTask = (
  value: unknown,
  fallbackId: string
): HydratedTask | null => {
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

const sanitizeStoredHistoryItem = (value: unknown): HistoryItem | null => {
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

const sanitizeOrganizeTask = (
  value: ApiTaskValue,
  fallbackId: string
): HydratedTask | null => {
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

const createTaskResult = (
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

export const useTasks = ({
  saveHistoryEntry,
  selectedHistoryEntry,
  latestCachedSession,
  selectionKey,
}: UseTasksOptions) => {
  const [input, setInputState] = useState('');
  const [result, setResult] = useState<TaskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [isTaskCacheChecked, setIsTaskCacheChecked] = useState(false);

  const mountedRef = useRef(true);
  const inputRef = useRef('');
  const resultRef = useRef<TaskResult | null>(null);
  const isProcessingRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSessionTimestampRef = useRef<number | null>(null);
  const activeHistoryEntryIdRef = useRef<string>('');
  const activeSourceRef = useRef<InputSource>('text');
  const lastHydratedSelectionRef = useRef<string | null>(null);
  const latestCacheHydratedRef = useRef(false);
  const taskCacheHydratedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!progressMessage || loading) {
      return;
    }

    const id = setTimeout(() => {
      if (mountedRef.current) {
        setProgressMessage(null);
      }
    }, 5000);

    return () => clearTimeout(id);
  }, [progressMessage, loading]);

  const syncInput = useCallback((nextInput: string) => {
    inputRef.current = nextInput;
    setInputState(nextInput);
  }, []);

  const syncResult = useCallback((nextResult: TaskResult | null) => {
    resultRef.current = nextResult;
    setResult(nextResult);
  }, []);

  const currentTask = useMemo(() => {
    const source = result?.focusTasks ?? result?.tasks ?? [];
    return source.find((task) => !task.completed) ?? null;
  }, [result?.focusTasks, result?.tasks]);

  const persistActiveSession = useCallback(
    async (nextResult: TaskResult, nextInput?: string) => {
      const timestamp = activeSessionTimestampRef.current;
      if (!timestamp) {
        return;
      }

      await saveHistoryEntry({
        id: activeHistoryEntryIdRef.current || generateHistoryItemId(),
        input: nextInput ?? inputRef.current,
        result: nextResult,
        timestamp,
        source: activeSourceRef.current,
      });
    },
    [saveHistoryEntry]
  );

  const persistActiveSessionInBackground = useCallback(
    (nextResult: TaskResult, nextInput?: string) => {
      void persistActiveSession(nextResult, nextInput)
        .then(() => {
          if (mountedRef.current) {
            setSaveWarning(null);
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setSaveWarning(SAVE_WARNING_MESSAGE);
          }
        });
    },
    [persistActiveSession]
  );

  const persistCurrentTaskCache = useCallback(
    async (nextResult: TaskResult, nextInput?: string) => {
      const timestamp = activeSessionTimestampRef.current;
      if (!timestamp) {
        return;
      }

      const cacheEntry: HistoryItem = {
        id: activeHistoryEntryIdRef.current || generateHistoryItemId('task-cache'),
        input: nextInput ?? inputRef.current,
        result: nextResult,
        timestamp,
        source: activeSourceRef.current,
      };

      await AsyncStorage.setItem(CURRENT_TASKS_KEY, JSON.stringify(cacheEntry));
    },
    []
  );

  const persistCurrentTaskCacheInBackground = useCallback(
    (nextResult: TaskResult, nextInput?: string) => {
      void persistCurrentTaskCache(nextResult, nextInput).catch((caughtError) => {
        console.error('Failed to save current task cache:', caughtError);
      });
    },
    [persistCurrentTaskCache]
  );

  const clearPersistedCurrentTaskState = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([CURRENT_TASKS_KEY, LATEST_SESSION_CACHE_KEY]);
    } catch (caughtError) {
      console.error('Failed to clear current task cache:', caughtError);
    }
  }, []);

  const resetRequestState = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;
    isProcessingRef.current = false;
  }, []);

  const organize = useCallback(
    async (text: string, source: InputSource, mode: OrganizeMode) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        if (mountedRef.current) {
          setError('Add one thought to get started.');
        }
        return;
      }

      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;
      activeSourceRef.current = source;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
        setSaveWarning(null);
        setProgressMessage('Organizing...');
      }

      try {
        await Haptics.selectionAsync();

        const response = await organizeTextApi(trimmedText, mode, controller.signal);
        if (!mountedRef.current || requestIdRef.current !== currentRequestId) {
          return;
        }

        setProgressMessage('Building plan...');

        const timestamp = Date.now();
        const sessionId = generateTaskId('task-session');

        const nextResult = createTaskResult(response, sessionId);
        const nextHistoryEntryId = generateHistoryItemId();

        activeSessionTimestampRef.current = timestamp;
        activeHistoryEntryIdRef.current = nextHistoryEntryId;

        syncResult(nextResult);
        syncInput('');

        persistCurrentTaskCacheInBackground(nextResult, trimmedText);
        persistActiveSessionInBackground(nextResult, trimmedText);

        if (!mountedRef.current || requestIdRef.current !== currentRequestId) {
          return;
        }

        setProgressMessage('Saved.');
      } catch (caughtError) {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        if (caughtError instanceof Error && caughtError.name === 'AbortError') {
          return;
        }

        if (mountedRef.current) {
          const message = isBackendUnavailableError(caughtError)
            ? OFFLINE_FALLBACK_MESSAGE
            : caughtError instanceof Error
              ? caughtError.message
              : 'Couldn’t organize that just now.';
          setError(message);
          setProgressMessage(null);
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          abortControllerRef.current = null;
          isProcessingRef.current = false;
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      }
    },
[
  persistActiveSessionInBackground,
  persistCurrentTaskCacheInBackground,
  syncInput,
  syncResult,
]
);

  const handleOrganize = useCallback(async (mode: OrganizeMode = 'full') => {
    const currentInput = inputRef.current;
    await organize(currentInput, 'text', mode);
  }, [organize]);

  const handleVoiceTranscript = useCallback(
    async (transcript: string, mode: OrganizeMode = 'full') => {
      const trimmedTranscript = transcript.trim();
      if (!trimmedTranscript) {
        setError('Couldn’t hear anything. Try again when ready.');
        return;
      }

      syncInput(trimmedTranscript);
      setError(null);
      setSaveWarning(null);
      setProgressMessage('Organizing...');
      await organize(trimmedTranscript, 'voice', mode);
    },
    [organize, syncInput]
  );

  const setInput = useCallback(
    (nextInput: string) => {
      syncInput(nextInput);
      activeSourceRef.current = 'text';
      setError(null);
      setSaveWarning(null);
      if (!loading) {
        setProgressMessage(null);
      }
    },
    [loading, syncInput]
  );

  useEffect(() => {
    const selectionIdentity =
      selectionKey ?? (selectedHistoryEntry ? String(selectedHistoryEntry.timestamp) : null);

    if (!selectedHistoryEntry || !selectionIdentity) {
      return;
    }

    if (lastHydratedSelectionRef.current === selectionIdentity) {
      return;
    }

    lastHydratedSelectionRef.current = selectionIdentity;
    resetRequestState();
    activeSessionTimestampRef.current = selectedHistoryEntry.timestamp;
    activeHistoryEntryIdRef.current = selectedHistoryEntry.id;
    activeSourceRef.current = selectedHistoryEntry.source;

    if (mountedRef.current) {
      syncInput(selectedHistoryEntry.input);
      syncResult(selectedHistoryEntry.result);
      setError(null);
      setSaveWarning(null);
      setLoading(false);
      setProgressMessage(null);
    }

    taskCacheHydratedRef.current = true;
    latestCacheHydratedRef.current = true;
    persistCurrentTaskCacheInBackground(selectedHistoryEntry.result, selectedHistoryEntry.input);
  }, [resetRequestState, selectedHistoryEntry, selectionKey, syncInput, syncResult]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentTaskCache = async () => {
      try {
        const rawValue = await AsyncStorage.getItem(CURRENT_TASKS_KEY);
        const parsedValue = rawValue ? (JSON.parse(rawValue) as unknown) : null;
        const cachedEntry = sanitizeStoredHistoryItem(parsedValue);

        if (cancelled || !cachedEntry) {
          return;
        }

        taskCacheHydratedRef.current = true;
        latestCacheHydratedRef.current = true;

        resetRequestState();
        activeSessionTimestampRef.current = cachedEntry.timestamp;
        activeHistoryEntryIdRef.current = cachedEntry.id;
        activeSourceRef.current = cachedEntry.source;

        if (mountedRef.current) {
          syncInput(cachedEntry.input);
          syncResult(cachedEntry.result);
          setError(null);
          setSaveWarning(null);
          setLoading(false);
          setProgressMessage(null);
        }
      } catch (caughtError) {
        console.error('Failed to load current task cache:', caughtError);
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsTaskCacheChecked(true);
        }
      }
    };

    void loadCurrentTaskCache();

    return () => {
      cancelled = true;
    };
  }, [resetRequestState, syncInput, syncResult]);

  useEffect(() => {
    if (
      !isTaskCacheChecked ||
      selectedHistoryEntry ||
      taskCacheHydratedRef.current ||
      latestCacheHydratedRef.current ||
      !latestCachedSession
    ) {
      return;
    }

    latestCacheHydratedRef.current = true;
    resetRequestState();
    activeSessionTimestampRef.current = latestCachedSession.timestamp;
    activeHistoryEntryIdRef.current = latestCachedSession.id;
    activeSourceRef.current = latestCachedSession.source;

    if (mountedRef.current) {
      syncInput(latestCachedSession.input);
      syncResult(latestCachedSession.result);
      setError(null);
      setSaveWarning(null);
      setLoading(false);
      setProgressMessage(null);
    }

    persistCurrentTaskCacheInBackground(latestCachedSession.result, latestCachedSession.input);
  }, [
    isTaskCacheChecked,
    latestCachedSession,
    persistCurrentTaskCacheInBackground,
    resetRequestState,
    selectedHistoryEntry,
    syncInput,
    syncResult,
  ]);

  const handleReorderTasks = useCallback(
    (tasks: Task[]) => {
      const currentResult = resultRef.current;
      if (!currentResult) return;

      const reorderedActiveTasks = tasks.filter((task) => !task.completed);
      const completedTasks = currentResult.tasks.filter((task) => task.completed);

      const nextResult = {
        ...currentResult,
        tasks: [...reorderedActiveTasks, ...completedTasks],
      };

      syncResult(nextResult);
      setError(null);
      setSaveWarning(null);
      setProgressMessage('Saved.');
      persistCurrentTaskCacheInBackground(nextResult);
      persistActiveSessionInBackground(nextResult);
    },
    [persistActiveSessionInBackground, persistCurrentTaskCacheInBackground, syncResult]
  );

  const toggleTaskCompleted = useCallback(
    (taskId: string) => {
      const currentResult = resultRef.current;
      if (!currentResult) return;

      const tasks = currentResult.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );

      const focusTasks = currentResult.focusTasks?.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );

      const completedTask = tasks.find((task) => task.id === taskId);

      const nextResult = {
        ...currentResult,
        tasks,
        ...(focusTasks ? { focusTasks } : {}),
      };

      syncResult(nextResult);
      setError(null);
      setSaveWarning(null);
      setProgressMessage(
        completedTask?.completed
          ? COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)]
          : 'Moved back to active.'
      );
      persistCurrentTaskCacheInBackground(nextResult);
      persistActiveSessionInBackground(nextResult);
    },
    [persistActiveSessionInBackground, persistCurrentTaskCacheInBackground, syncResult]
  );

  const setTaskPriority = useCallback(
    (taskId: string, priority?: TaskPriority) => {
      const currentResult = resultRef.current;
      if (!currentResult) return;

      const tasks = currentResult.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              priority: task.priority === priority ? undefined : priority,
            }
          : task
      );

      const focusTasks = currentResult.focusTasks?.map((task) =>
        task.id === taskId
          ? {
              ...task,
              priority: task.priority === priority ? undefined : priority,
            }
          : task
      );

      const nextResult = {
        ...currentResult,
        tasks,
        ...(focusTasks ? { focusTasks } : {}),
      };

      syncResult(nextResult);
      setError(null);
      setSaveWarning(null);
      setProgressMessage('Saved.');
      persistCurrentTaskCacheInBackground(nextResult);
      persistActiveSessionInBackground(nextResult);
    },
    [persistActiveSessionInBackground, persistCurrentTaskCacheInBackground, syncResult]
  );

  const clearTasks = useCallback(() => {
    resetRequestState();

    syncInput('');
    syncResult(null);

    activeSessionTimestampRef.current = null;
    activeHistoryEntryIdRef.current = '';
    activeSourceRef.current = 'text';
    taskCacheHydratedRef.current = false;
    latestCacheHydratedRef.current = true;

    setError(null);
    setSaveWarning(null);
    setProgressMessage(null);
    setLoading(false);

    void clearPersistedCurrentTaskState();
  }, [clearPersistedCurrentTaskState, resetRequestState, syncInput, syncResult]);

  return {
    input,
    setInput,
    result,
    currentTask,
    loading,
    error,
    progressMessage,
    saveWarning,
    handleOrganize,
    handleVoiceTranscript,
    handleReorderTasks,
    toggleTaskCompleted,
    setTaskPriority,
    clearTasks,
  };
};
