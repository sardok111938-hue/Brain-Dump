import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Controls } from '@/components/Controls';
import { ErrorMessage } from '@/components/ErrorMessage';
import { FocusCard } from '@/components/FocusCard';
import { Header } from '@/components/Header';
import { InputCard } from '@/components/InputCard';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ProgressMessage } from '@/components/ProgressMessage';
import { SupportPopup } from '@/components/SupportPopup';
import { TaskList } from '@/components/TaskList';
import { useAudio } from '@/hooks/useAudio';
import { useHistory } from '@/hooks/useHistory';
import { useSupportPopup } from '@/hooks/useSupportPopup';
import { useTasks } from '@/hooks/useTasks';

export default function HomeScreen() {
  const {
    supportPopupVisible,
    closeSupportPopup,
    markSupportPopupShown,
    registerSuccessfulSession,
  } = useSupportPopup();

  const params = useLocalSearchParams<{
    selectedTimestamp?: string;
    selectedHistoryId?: string;
    selectionKey?: string;
  }>();

  const selectedTimestamp = useMemo(() => {
    const rawValue = Array.isArray(params.selectedTimestamp)
      ? params.selectedTimestamp[0]
      : params.selectedTimestamp;

    if (!rawValue) return null;

    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }, [params.selectedTimestamp]);

  const selectionKey = useMemo(
    () =>
      (Array.isArray(params.selectionKey)
        ? params.selectionKey[0]
        : params.selectionKey) ?? null,
    [params.selectionKey]
  );

  const selectedHistoryId = useMemo(
    () =>
      (Array.isArray(params.selectedHistoryId)
        ? params.selectedHistoryId[0]
        : params.selectedHistoryId) ?? null,
    [params.selectedHistoryId]
  );

  const { streak, todayUsage, selectedEntry, latestSession, upsertHistoryEntry } =
    useHistory(selectedTimestamp, selectedHistoryId);

 const {
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
} = useTasks({
  saveHistoryEntry: upsertHistoryEntry,
  selectedHistoryEntry: selectedEntry,
  latestCachedSession: latestSession,
  selectionKey,
});


  const { recordingStatus, error: audioError, toggleRecording } = useAudio({
  onTranscript: async (transcript) => {
    setShowFocusCompletionEndState(false);
    const { ok } = await handleVoiceTranscript(transcript, focusModeRequested ? 'focus' : 'full');

    if (ok) {
      await registerSuccessfulSession();
    }
  },
});

const [pendingCompleteIds, setPendingCompleteIds] = useState<string[]>([]);
const completionTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
const screenMountedRef = useRef(true);

  // 🔹 Focus state
  const [focusModeRequested, setFocusModeRequested] = useState(false);
  const [showFocusCompletionEndState, setShowFocusCompletionEndState] = useState(false);
  const [focusStarted, setFocusStarted] = useState(false);
  const [focusCardVisible, setFocusCardVisible] = useState(true);

  // 🔹 Timer state
  const FOCUS_DURATION_SECONDS = 25 * 60;
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(FOCUS_DURATION_SECONDS);

  const clearPendingCompletionTimeouts = useCallback((resetPendingState = true) => {
  completionTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
  completionTimeoutsRef.current.clear();

  if (resetPendingState && screenMountedRef.current) {
    setPendingCompleteIds([]);
  }
}, []);

useEffect(() => {
  screenMountedRef.current = true;

  return () => {
    screenMountedRef.current = false;
    clearPendingCompletionTimeouts(false);
  };
}, [clearPendingCompletionTimeouts]);


  const handleClearTasks = useCallback(() => {
    Alert.alert(
      'Clear tasks?',
      'This will remove your current tasks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearPendingCompletionTimeouts();
            clearTasks();
            setShowFocusCompletionEndState(false);
            setFocusStarted(false);
            setFocusCardVisible(true);
            setFocusModeRequested(false);
            setFocusSecondsLeft(FOCUS_DURATION_SECONDS);
          },
        },
      ]
    );
  }, [FOCUS_DURATION_SECONDS, clearPendingCompletionTimeouts, clearTasks]);

  const handleSupport = useCallback((amount: 2 | 5 | 10) => {
  closeSupportPopup();

  const paypalLinks = {
    2: 'https://www.paypal.com/ncp/payment/LK2963LGGYFMC',
    5: 'https://www.paypal.com/ncp/payment/NN34JJJLDX5K2',
    10: 'https://www.paypal.com/ncp/payment/2DFLAXY4C8VKN',
  };

  Linking.openURL(paypalLinks[amount]).catch(() => {
    Alert.alert('Could not open PayPal', 'Please try again later.');
  });
}, [closeSupportPopup]);

  // 🔹 Derived state
  const activeError = audioError ?? error;

  const activeTasks = useMemo(
    () => result?.tasks.filter((task) => !task.completed) ?? [],
    [result?.tasks]
  );

  const hasActiveTasks = activeTasks.length > 0;
  const hasCurrentTask = Boolean(currentTask);
  const isFocusModeActive = focusModeRequested && hasCurrentTask;

  const shouldShowFocusCard = Boolean(
    focusModeRequested && hasCurrentTask && currentTask && focusCardVisible
  );
  // 🔹 Reset when task changes
  useEffect(() => {
    setFocusStarted(false);
    setFocusSecondsLeft(FOCUS_DURATION_SECONDS);
    setFocusCardVisible(true);
  }, [FOCUS_DURATION_SECONDS, currentTask?.id]);

  // 🔹 Timer countdown
  useEffect(() => {
    if (!focusStarted || !isFocusModeActive) return;

    const timer = setInterval(() => {
      setFocusSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [focusStarted, isFocusModeActive]);

  // 🔹 Format timer
  const focusTimeLabel = useMemo(() => {
    const minutes = Math.floor(focusSecondsLeft / 60);
    const seconds = focusSecondsLeft % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [focusSecondsLeft]);

  // 🔹 Reset completion state
  useEffect(() => {
  if (!focusModeRequested) {
    setShowFocusCompletionEndState(false);
  }
}, [focusModeRequested]);

  const handleInputChange = useCallback(
    (nextInput: string) => {
      setShowFocusCompletionEndState(false);
      setInput(nextInput);
    },
    [setInput]
  );

  const handleStartOrganize = useCallback(async () => {
  setShowFocusCompletionEndState(false);

  const { ok } = await handleOrganize(focusModeRequested ? 'focus' : 'full');

if (ok) {
  await registerSuccessfulSession();
}
}, [focusModeRequested, handleOrganize, registerSuccessfulSession]);


  const handleToggleTask = useCallback(
  (taskId: string) => {
    if (completionTimeoutsRef.current.has(taskId)) {
      return;
    }

    const targetTask = result?.tasks.find((task) => task.id === taskId);
    const focusSourceTasks =
      isFocusModeActive && result?.focusTasks?.length ? result.focusTasks : result?.tasks ?? [];

    const unfinishedTaskCount = focusSourceTasks.filter((task) => !task.completed).length;
    const shouldShowFocusCompleteAfterCommit =
      !!targetTask &&
      isFocusModeActive &&
      !targetTask.completed &&
      unfinishedTaskCount === 1;

    if (targetTask?.completed) {
      setShowFocusCompletionEndState(false);
    }

    setPendingCompleteIds((ids) => (ids.includes(taskId) ? ids : [...ids, taskId]));

    const timeoutId = setTimeout(() => {
      completionTimeoutsRef.current.delete(taskId);

      if (!screenMountedRef.current) {
        return;
      }

      toggleTaskCompleted(taskId);

      setPendingCompleteIds((ids) => ids.filter((id) => id !== taskId));

      if (shouldShowFocusCompleteAfterCommit) {
  setFocusStarted(false);
  setFocusCardVisible(false);
  setShowFocusCompletionEndState(true);
}
    }, 1200);

    completionTimeoutsRef.current.set(taskId, timeoutId);
  },
  [isFocusModeActive, result?.focusTasks, result?.tasks, toggleTaskCompleted]
);

  const listHeader = useMemo(
    () => (
      <View style={styles.headerContent}>
        {loading && !result?.tasks.length ? <LoadingOverlay /> : null}
        {activeError ? <ErrorMessage message={activeError} /> : null}
        {saveWarning ? <ErrorMessage message={saveWarning} /> : null}
        {!isFocusModeActive && progressMessage ? (
          <ProgressMessage message={progressMessage} />
        ) : null}

        <Header
          streak={streak}
          todayUsage={todayUsage}
          focusModeEnabled={focusModeRequested}
          onToggleFocus={() => {
            setFocusStarted(false);
            setFocusCardVisible(true);
            setFocusModeRequested((value) => !value);
          }}
          onClearTasks={handleClearTasks}
        />

        <InputCard
        value={input}
        onChangeText={handleInputChange}
        disabled={loading}/>

        <Controls
          onOrganize={handleStartOrganize}
          organizeDisabled={!input.trim() || loading}          
          recordingDisabled={loading || recordingStatus === 'transcribing'}
          loading={loading}
          recordingStatus={recordingStatus}
          onRecordingToggle={toggleRecording}
        />
      </View>
    ),
    [
      activeError,
      focusModeRequested,
      handleInputChange,
      handleStartOrganize,
      handleClearTasks,
      input,
      isFocusModeActive,
      loading,
      progressMessage,
      recordingStatus,
      result,
      saveWarning,
      streak,
      todayUsage,
      toggleRecording,
    ]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {focusModeRequested && !focusCardVisible && hasCurrentTask && !showFocusCompletionEndState ? (
          <Pressable
            onPress={() => {
              setFocusStarted(false);
              setFocusCardVisible(true);
            }}
            style={styles.floatingFocusButton}
          >
            <Text style={styles.floatingFocusText}>← Focus</Text>
          </Pressable>
        ) : null}

        {hasActiveTasks && result && !shouldShowFocusCard && !showFocusCompletionEndState ? (
          <TaskList
  tasks={focusModeRequested && result.focusTasks?.length ? result.focusTasks : result.tasks}
  pendingCompleteIds={pendingCompleteIds}
  onReorder={handleReorderTasks}
  onToggleTask={handleToggleTask}
  onSetTaskPriority={setTaskPriority}
  ListHeaderComponent={listHeader}
/>
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {listHeader}

            {shouldShowFocusCard && currentTask ? (
              <>
                {progressMessage ? <ProgressMessage message={progressMessage} /> : null}

                <FocusCard
                  task={currentTask}
                  started={focusStarted}
                  timerLabel={focusStarted ? focusTimeLabel : undefined}
                  onStart={() => setFocusStarted(true)}
                  onDone={() => handleToggleTask(currentTask.id)}
                  onViewAll={() => {
                    setFocusStarted(false);
                    setFocusCardVisible(false);
                  }}
                />
              </>
            ) : null}

            {!hasActiveTasks && result && !showFocusCompletionEndState && !focusModeRequested ? (
              <View style={styles.completedSessionCard}>
                <Text style={styles.completedSessionTitle}>All done.</Text>
                <Text style={styles.completedSessionText}>Add another task if you want.</Text>
              </View>
            ) : null}

            {showFocusCompletionEndState ? (
              <View style={styles.completedSessionCard}>
                <Text style={styles.completedSessionTitle}>All done.</Text>
                <Text style={styles.completedSessionText}>You can stop here.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <SupportPopup
        visible={supportPopupVisible}
        onClose={closeSupportPopup}
        onMaybeLater={markSupportPopupShown}
        onSupport={handleSupport}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  keyboard: {
    flex: 1,
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 140,
    backgroundColor: '#F4F7FB',
  },
  headerContent: {
    paddingBottom: 8,
  },

  completedSessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  completedSessionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  completedSessionText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#64748B',
  },
  floatingFocusButton: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 20,
  },
  floatingFocusText: {
    color: '#C2410C',
    fontSize: 14,
    fontWeight: '800',
  },
});
