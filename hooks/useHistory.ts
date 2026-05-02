import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { ensureUniqueHistoryIds, generateHistoryItemId } from '@/hooks/historyIdentity';
import { ensureUniqueTaskIds } from '@/hooks/taskIdentity';
import {
  HistoryGroup,
  HistoryItem,
  PlanGroups,
  ProgressStats,
  TASK_PRIORITY_VALUES,
  TASK_TIME_VALUES,
  Task,
  TaskPriority,
  TaskTime,
  TaskResult,
} from '@/types';

const HISTORY_KEY = 'brainDumpHistory';
const LATEST_SESSION_CACHE_KEY = 'brainDumpLatestSession';
const MAX_HISTORY_ITEMS = 300;
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

type HistoryStoreSnapshot = {
  history: HistoryItem[];
  latestSession: HistoryItem | null;
  isLoaded: boolean;
};

const historyStoreListeners = new Set<(snapshot: HistoryStoreSnapshot) => void>();

let historyStoreSnapshot: HistoryStoreSnapshot = {
  history: [],
  latestSession: null,
  isLoaded: false,
};

const publishHistoryStore = (snapshot: HistoryStoreSnapshot) => {
  historyStoreSnapshot = snapshot;
  historyStoreListeners.forEach((listener) => listener(snapshot));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const TASK_TIME_SET = new Set<TaskTime>(TASK_TIME_VALUES);
const TASK_PRIORITY_SET = new Set<TaskPriority>(TASK_PRIORITY_VALUES);
const isTaskTime = (value: string): value is TaskTime => TASK_TIME_SET.has(value as TaskTime);
const isTaskPriority = (value: string): value is TaskPriority =>
  TASK_PRIORITY_SET.has(value as TaskPriority);

const startOfDay = (value: number | Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const addDays = (value: number | Date, days: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return startOfDay(date);
};

const formatDateKey = (value: number | Date) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const isSameDay = (left: number | Date, right: number | Date) =>
  startOfDay(left) === startOfDay(right);

const sanitizePlanGroups = (value: unknown): PlanGroups => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<PlanGroups>((groups, [key, groupValue]) => {
    if (!Array.isArray(groupValue)) {
      return groups;
    }

    const items = groupValue.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (items.length > 0) {
      groups[key] = items;
    }

    return groups;
  }, {});
};

const sanitizeTask = (
  value: unknown,
  fallbackId: string,
  completedTaskIds: Set<string>
): (Omit<Task, 'id'> & { id?: string }) | null => {
  if (typeof value === 'string') {
    const text = value.trim();
    return text
      ? {
          id: fallbackId,
          text,
          completed: false,
        }
      : null;
  }

  if (!isRecord(value) || typeof value.text !== 'string') {
    return null;
  }

  const text = value.text.trim();
  if (!text) {
    return null;
  }

  const id = typeof value.id === 'string' && value.id.trim() ? value.id : fallbackId;
  
  const rawTime = typeof value.time === 'string' ? value.time.trim().toLowerCase() : '';
  const time = isTaskTime(rawTime) ? rawTime : undefined;
  const reason =
    typeof value.reason === 'string' && value.reason.trim().length > 0
      ? value.reason.trim()
      : undefined;
  const rawPriority =
    typeof value.priority === 'string' ? value.priority.trim().toLowerCase() : '';
  const priority = isTaskPriority(rawPriority) ? rawPriority : undefined;
  
  return {
    id,
    text,
    completed: typeof value.completed === 'boolean' ? value.completed : completedTaskIds.has(id),
    time,
    reason,
    priority,
  };
};

const sanitizeTaskArray = (
  values: unknown,
  scope: string,
  completedTaskIds: Set<string>
) =>
  ensureUniqueTaskIds(
    (Array.isArray(values) ? values : []).reduce<Array<Omit<Task, 'id'> & { id?: string }>>(
      (nextTasks, taskValue, index) => {
        const task = sanitizeTask(taskValue, `${scope}-${index}`, completedTaskIds);
        if (task) {
          nextTasks.push(task);
        }
        return nextTasks;
      },
      []
    ),
    { scope }
  );

const sanitizeTaskResult = (value: unknown, timestamp: number): TaskResult | null => {
  if (!isRecord(value)) {
    return null;
  }

  const completedTaskIds = Array.isArray(value.completedTasks)
    ? new Set(
        value.completedTasks.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0
        )
      )
    : new Set<string>();

  const fullViewValues = Array.isArray(value.tasks)
    ? value.tasks
    : Array.isArray(value.fullViewTasks)
      ? value.fullViewTasks
      : [];

  const tasks = sanitizeTaskArray(fullViewValues, `history-${timestamp}`, completedTaskIds);

  if (tasks.length === 0) {
    return null;
  }

  return {
    tasks,
    plan: sanitizePlanGroups(value.plan),
  };
};

const sanitizeHistoryEntry = (value: unknown): HistoryItem | null => {
  if (!isRecord(value) || typeof value.input !== 'string' || typeof value.timestamp !== 'number') {
    return null;
  }

  const result = sanitizeTaskResult(value.result, value.timestamp);
  if (!result) {
    return null;
  }

  return {
    id: typeof value.id === 'string' ? value.id : '',
    input: value.input,
    result,
    timestamp: value.timestamp,
    source: value.source === 'voice' ? 'voice' : 'text',
  };
};

const formatGroupLabel = (timestamp: number) => {
  const itemDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(itemDate, today)) {
    return 'Today';
  }

  if (isSameDay(itemDate, yesterday)) {
    return 'Yesterday';
  }

  return itemDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: itemDate.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

const buildHistoryGroups = (history: HistoryItem[]): HistoryGroup[] => {
  const groups = history.reduce<Map<string, HistoryItem[]>>((map, item) => {
    const key = formatGroupLabel(item.timestamp);
    const groupItems = map.get(key) ?? [];
    groupItems.push(item);
    map.set(key, groupItems);
    return map;
  }, new Map<string, HistoryItem[]>());

  return Array.from(groups.entries())
  .map(([title, items]) => ({
    title,
    items: [...items].sort((a, b) => b.timestamp - a.timestamp),
  }))
  .sort((a, b) => b.items[0].timestamp - a.items[0].timestamp);
};



const calculateStreak = (history: HistoryItem[]) => {
  const today = startOfDay(Date.now());
  const todayUsage = history.some((item) => startOfDay(item.timestamp) === today);

  if (!todayUsage) {
    return {
      streak: 0,
      todayUsage: false,
    };
  }

  let streak = 1;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 1);

  while (history.some((item) => startOfDay(item.timestamp) === cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    streak,
    todayUsage: true,
  };
};

const calculateBestStreak = (history: HistoryItem[]) => {
  const uniqueDays = Array.from(new Set(history.map((item) => startOfDay(item.timestamp)))).sort(
    (left, right) => left - right
  );

  if (uniqueDays.length === 0) {
    return 0;
  }

  let bestStreak = 1;
  let currentStreak = 1;

  for (let index = 1; index < uniqueDays.length; index += 1) {
    if (addDays(uniqueDays[index - 1], 1) === uniqueDays[index]) {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return bestStreak;
};

const calculateCompletionRate = (totalTasks: number, completedTasks: number) =>
  totalTasks === 0 ? null : completedTasks / totalTasks;

const calculateWeeklyCompletionTrend = (
  currentRate: number | null,
  previousRate: number | null
): ProgressStats['weeklyCompletionTrend'] => {
  if (currentRate === null && previousRate === null) {
    return 'none';
  }

  if (currentRate === null) {
    return 'down';
  }

  if (previousRate === null) {
    return 'up';
  }

  const delta = currentRate - previousRate;

  if (Math.abs(delta) < 0.001) {
    return 'flat';
  }

  return delta > 0 ? 'up' : 'down';
};

const formatProgressDayLabel = (dayStart: number, todayStart: number) => {
  if (dayStart === todayStart) {
    return 'Today';
  }

  if (dayStart === addDays(todayStart, -1)) {
    return 'Yesterday';
  }

  return new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' });
};

export const useHistory = (
  selectedTimestamp?: number | null,
  selectedHistoryId?: string | null
) => {
  const [history, setHistory] = useState<HistoryItem[]>(historyStoreSnapshot.history);
  const [latestSession, setLatestSession] = useState<HistoryItem | null>(historyStoreSnapshot.latestSession);
  const [isLoaded, setIsLoaded] = useState(historyStoreSnapshot.isLoaded);
  const historyRef = useRef<HistoryItem[]>(historyStoreSnapshot.history);

  const syncFromSnapshot = useCallback((snapshot: HistoryStoreSnapshot) => {
    historyRef.current = snapshot.history;
    setHistory(snapshot.history);
    setLatestSession(snapshot.latestSession);
    setIsLoaded(snapshot.isLoaded);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const [rawHistoryValue, rawLatestSessionValue] = await AsyncStorage.multiGet([
        HISTORY_KEY,
        LATEST_SESSION_CACHE_KEY,
      ]);
      const historyValue = rawHistoryValue[1];
      const latestSessionValue = rawLatestSessionValue[1];

      const nextHistory = historyValue
        ? (() => {
            const parsedValue = JSON.parse(historyValue) as unknown;
            return Array.isArray(parsedValue)
              ? ensureUniqueHistoryIds(
                  parsedValue
                    .map((item) => sanitizeHistoryEntry(item))
                    .filter((item): item is HistoryItem => item !== null)
                    .sort((left, right) => right.timestamp - left.timestamp)
                )
              : [];
          })()
        : [];

      const nextLatestSession = latestSessionValue
        ? (() => {
            const parsedValue = JSON.parse(latestSessionValue) as unknown;
            const latestItem = sanitizeHistoryEntry(parsedValue);
            return latestItem ? ensureUniqueHistoryIds([latestItem])[0] ?? null : null;
          })()
        : null;

      publishHistoryStore({
        history: nextHistory,
        latestSession: nextLatestSession,
        isLoaded: true,
      });
    } catch (error) {
      console.error('Failed to load history:', error);
      publishHistoryStore({
        history: [],
        latestSession: null,
        isLoaded: true,
      });
    }
  }, []);

  const persistHistory = useCallback(async (nextHistory: HistoryItem[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (error) {
      console.error('Failed to save history:', error);
      throw error;
    }
  }, []);

  const persistLatestSession = useCallback(async (entry: HistoryItem | null) => {
    try {
      if (!entry) {
        await AsyncStorage.removeItem(LATEST_SESSION_CACHE_KEY);
        return;
      }

      await AsyncStorage.setItem(LATEST_SESSION_CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to save latest session cache:', error);
      throw error;
    }
  }, []);

  const upsertHistoryEntry = useCallback(
    async (entry: HistoryItem) => {
      const normalizedEntry: HistoryItem = {
        ...entry,
        id: entry.id.trim() || generateHistoryItemId(),
      };

      const nextHistory = ensureUniqueHistoryIds(
        [normalizedEntry, ...historyRef.current.filter((item) => item.id !== normalizedEntry.id)]
          .sort((left, right) => right.timestamp - left.timestamp)
          .slice(0, MAX_HISTORY_ITEMS)
      );

      await Promise.all([
        persistHistory(nextHistory),
        persistLatestSession(normalizedEntry),
      ]);

      publishHistoryStore({
        history: nextHistory,
        latestSession: normalizedEntry,
        isLoaded: true,
      });
    },
    [persistHistory, persistLatestSession]
  );

  const deleteHistoryEntry = useCallback(
    async (id: string) => {
      const nextHistory = historyRef.current.filter((item) => item.id !== id);
      const nextLatestSession =
        historyStoreSnapshot.latestSession?.id === id ? nextHistory[0] ?? null : historyStoreSnapshot.latestSession;

      await Promise.all([
        persistHistory(nextHistory),
        persistLatestSession(nextLatestSession),
      ]);

      publishHistoryStore({
        history: nextHistory,
        latestSession: nextLatestSession,
        isLoaded: true,
      });
    },
    [persistHistory, persistLatestSession]
  );

  useEffect(() => {
    syncFromSnapshot(historyStoreSnapshot);
    const listener = (snapshot: HistoryStoreSnapshot) => {
      syncFromSnapshot(snapshot);
    };

    historyStoreListeners.add(listener);

    return () => {
      historyStoreListeners.delete(listener);
    };
  }, [syncFromSnapshot]);

  useEffect(() => {
    if (historyStoreSnapshot.isLoaded) {
      syncFromSnapshot(historyStoreSnapshot);
      return;
    }

    void loadHistory();
  }, [loadHistory, syncFromSnapshot]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const historyGroups = useMemo(() => buildHistoryGroups(history), [history]);

  const progressStats = useMemo<ProgressStats>(() => {
    const streakStats = calculateStreak(history);
    const todayStart = startOfDay(Date.now());
    const currentWindowStart = addDays(todayStart, -6);
    const previousWindowStart = addDays(todayStart, -13);
    const previousWindowEnd = addDays(todayStart, -7);

    const totalEntries = history.length;
    const totalTasks = history.reduce((sum, item) => sum + item.result.tasks.length, 0);
    const completedTasks = history.reduce(
      (sum, item) => sum + item.result.tasks.filter((task) => task.completed).length,
      0
    );
    const currentWindowEntries = history.filter((item) => {
      const dayStart = startOfDay(item.timestamp);
      return dayStart >= currentWindowStart && dayStart <= todayStart;
    });
    const previousWindowEntries = history.filter((item) => {
      const dayStart = startOfDay(item.timestamp);
      return dayStart >= previousWindowStart && dayStart <= previousWindowEnd;
    });

    const weeklyTasks = currentWindowEntries.reduce(
      (sum, item) => sum + item.result.tasks.length,
      0
    );
    const weeklyCompletedTasks = currentWindowEntries.reduce(
      (sum, item) => sum + item.result.tasks.filter((task) => task.completed).length,
      0
    );
    const previousWeeklyTasks = previousWindowEntries.reduce(
      (sum, item) => sum + item.result.tasks.length,
      0
    );
    const previousWeeklyCompletedTasks = previousWindowEntries.reduce(
      (sum, item) => sum + item.result.tasks.filter((task) => task.completed).length,
      0
    );
    const weeklyDays = new Set(
      currentWindowEntries.map((item) => startOfDay(item.timestamp))
    ).size;
    const completedByWeekday = history.reduce<number[]>((counts, item) => {
      const completedCount = item.result.tasks.filter((task) => task.completed).length;

      if (completedCount > 0) {
        counts[new Date(item.timestamp).getDay()] += completedCount;
      }

      return counts;
    }, Array.from({ length: 7 }, () => 0));
    const mostProductiveDayIndex = completedByWeekday.reduce(
      (bestIndex, count, index, counts) =>
        count > counts[bestIndex] ? index : bestIndex,
      0
    );
    const currentCompletionRate = calculateCompletionRate(weeklyTasks, weeklyCompletedTasks);
    const previousCompletionRate = calculateCompletionRate(
      previousWeeklyTasks,
      previousWeeklyCompletedTasks
    );
    const dailyBreakdown = Array.from({ length: 7 }, (_, index) => {
      const dayStart = addDays(todayStart, -index);
      const entries = history.filter((item) => startOfDay(item.timestamp) === dayStart);

      return {
        dateKey: formatDateKey(dayStart),
        label: formatProgressDayLabel(dayStart, todayStart),
        taskCount: entries.reduce((sum, item) => sum + item.result.tasks.length, 0),
        completedCount: entries.reduce(
          (sum, item) => sum + item.result.tasks.filter((task) => task.completed).length,
          0
        ),
        entryCount: entries.length,
      };
    });

    return {
      streak: streakStats.streak,
      todayUsage: streakStats.todayUsage,
      totalEntries,
      totalTasks,
      completedTasks,
      completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      weeklyTasks,
      weeklyDays,
      bestStreak: calculateBestStreak(history),
      averageTasksPerSession: totalEntries === 0 ? 0 : totalTasks / totalEntries,
      mostProductiveDay:
        completedByWeekday[mostProductiveDayIndex] > 0
          ? WEEKDAY_LABELS[mostProductiveDayIndex]
          : null,
      voiceSessionCount: history.filter((item) => item.source === 'voice').length,
      textSessionCount: history.filter((item) => item.source === 'text').length,
      weeklyCompletionTrend: calculateWeeklyCompletionTrend(
        currentCompletionRate,
        previousCompletionRate
      ),
      dailyBreakdown,
    };
  }, [history]);

  const selectedEntry = useMemo(
    () =>
      selectedHistoryId
        ? history.find((item) => item.id === selectedHistoryId) ??
          (typeof selectedTimestamp === 'number'
            ? history.find((item) => item.timestamp === selectedTimestamp) ?? null
            : null)
        : typeof selectedTimestamp === 'number'
          ? history.find((item) => item.timestamp === selectedTimestamp) ?? null
          : null,
    [history, selectedHistoryId, selectedTimestamp]
  );

  return {
    history,
    historyGroups,
    latestSession,
    progressStats,
    streak: progressStats.streak,
    todayUsage: progressStats.todayUsage,
    selectedEntry,
    isLoaded,
    upsertHistoryEntry,
    deleteHistoryEntry,
  };
};
