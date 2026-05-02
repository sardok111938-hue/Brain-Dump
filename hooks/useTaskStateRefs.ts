import { useRef } from 'react';

import { InputSource, TaskResult } from '@/types';

export const useTaskStateRefs = () => {
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

  return {
    mountedRef,
    inputRef,
    resultRef,
    isProcessingRef,
    requestIdRef,
    abortControllerRef,
    activeSessionTimestampRef,
    activeHistoryEntryIdRef,
    activeSourceRef,
    lastHydratedSelectionRef,
    latestCacheHydratedRef,
    taskCacheHydratedRef,
  } as const;
};