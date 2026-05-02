import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitizeStoredHistoryItem } from '@/hooks/taskSanitizers';
import { HistoryItem } from '@/types';

export const CURRENT_TASKS_KEY = 'brainDumpTasks';
export const LATEST_SESSION_CACHE_KEY = 'brainDumpLatestSession';

export const loadCurrentTaskCache = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(CURRENT_TASKS_KEY);
    const parsedValue = rawValue ? (JSON.parse(rawValue) as unknown) : null;
    return sanitizeStoredHistoryItem(parsedValue);
  } catch {
    return null;
  }
};

export const persistCurrentTaskCache = async (entry: HistoryItem) => {
  await AsyncStorage.setItem(CURRENT_TASKS_KEY, JSON.stringify(entry));
};

export const clearPersistedCurrentTaskState = async () => {
  await AsyncStorage.multiRemove([CURRENT_TASKS_KEY, LATEST_SESSION_CACHE_KEY]);
};
