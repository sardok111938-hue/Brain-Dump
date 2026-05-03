import { useCallback } from 'react';

import { COMPLETION_MESSAGES } from '@/hooks/taskMessages';
import { InputSource, Task, TaskPriority, TaskResult } from '@/types';

type UseTaskActionsOptions = {
  resultRef: React.MutableRefObject<TaskResult | null>;
  activeSessionTimestampRef: React.MutableRefObject<number | null>;
  activeHistoryEntryIdRef: React.MutableRefObject<string>;
  activeSourceRef: React.MutableRefObject<InputSource>;
  taskCacheHydratedRef: React.MutableRefObject<boolean>;
  latestCacheHydratedRef: React.MutableRefObject<boolean>;
  syncResult: (nextResult: TaskResult | null) => void;
  persistCurrentTaskCacheInBackground: (nextResult: TaskResult, nextInput?: string) => void;
  persistActiveSessionInBackground: (nextResult: TaskResult, nextInput?: string) => void;
  resetRequestState: () => void;
  syncInput: (nextInput: string) => void;
  clearPersistedCurrentTaskState: () => void | Promise<void>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSaveWarning: React.Dispatch<React.SetStateAction<string | null>>;
  setProgressMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

export const useTaskActions = ({
  resultRef,
  activeSessionTimestampRef,
  activeHistoryEntryIdRef,
  activeSourceRef,
  taskCacheHydratedRef,
  latestCacheHydratedRef,
  syncResult,
  persistCurrentTaskCacheInBackground,
  persistActiveSessionInBackground,
  resetRequestState,
  syncInput,
  clearPersistedCurrentTaskState,
  setError,
  setLoading,
  setSaveWarning,
  setProgressMessage,
}: UseTaskActionsOptions) => {
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
    [
      persistActiveSessionInBackground,
      persistCurrentTaskCacheInBackground,
      resultRef,
      setError,
      setProgressMessage,
      setSaveWarning,
      syncResult,
    ]
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
    [
      persistActiveSessionInBackground,
      persistCurrentTaskCacheInBackground,
      resultRef,
      setError,
      setProgressMessage,
      setSaveWarning,
      syncResult,
    ]
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
    [
      persistActiveSessionInBackground,
      persistCurrentTaskCacheInBackground,
      resultRef,
      setError,
      setProgressMessage,
      setSaveWarning,
      syncResult,
    ]
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
    setLoading(false);
    setSaveWarning(null);
    setProgressMessage(null);

    void clearPersistedCurrentTaskState();
  }, [
    activeHistoryEntryIdRef,
    activeSessionTimestampRef,
    activeSourceRef,
    clearPersistedCurrentTaskState,
    latestCacheHydratedRef,
    resetRequestState,
    setError,
    setLoading,
    setProgressMessage,
    setSaveWarning,
    syncInput,
    syncResult,
    taskCacheHydratedRef,
  ]);

  return {
    handleReorderTasks,
    toggleTaskCompleted,
    setTaskPriority,
    clearTasks,
  };
};
