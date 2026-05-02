import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

import { isBackendUnavailableError, transcribeAudioApi } from '@/services/api';
import { RecordingStatus } from '@/types';

const OFFLINE_FALLBACK_MESSAGE = 'Offline right now. Try again when ready.';

type UseAudioOptions = {
  onTranscript: (transcript: string) => Promise<void>;
};

export const useAudio = ({ onTranscript }: UseAudioOptions) => {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isProcessingRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();

      const recording = recordingRef.current;
      if (recording) {
        void recording.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isProcessingRef.current || recordingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    try {
      setError(null);

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Turn on microphone access to use voice input.');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setRecordingStatus('recording');
    } catch (caughtError) {
      console.error('Start recording error:', caughtError);

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Couldn’t start recording. Try again when ready.';

      if (mountedRef.current) {
        setError(message);
        setRecordingStatus('idle');
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording || isProcessingRef.current) {
      return null;
    }

    isProcessingRef.current = true;
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    try {
      setError(null);
      setRecordingStatus('transcribing');
      await Haptics.selectionAsync();
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Couldn’t use that recording. Try again when ready.');
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const response = await transcribeAudioApi(uri, controller.signal);

      if (requestIdRef.current !== currentRequestId) {
        return null;
      }

      const transcript = response.text.trim();

      if (!transcript) {
        if (mountedRef.current && requestIdRef.current === currentRequestId) {
          setError('Couldn’t hear anything. Try again when ready.');
          setRecordingStatus('idle');
        }

        return null;
      }

      return transcript;
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.name === 'AbortError') {
        return null;
      }

      const message = isBackendUnavailableError(caughtError)
        ? OFFLINE_FALLBACK_MESSAGE
        : caughtError instanceof Error
          ? caughtError.message
          : 'Couldn’t use that recording. Try again when ready.';

      if (mountedRef.current && requestIdRef.current === currentRequestId) {
        setError(message);
      }

      return null;
    } finally {
      recordingRef.current = null;
      abortControllerRef.current = null;
      isProcessingRef.current = false;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      }).catch(() => undefined);

      if (mountedRef.current && requestIdRef.current === currentRequestId) {
        setRecordingStatus('idle');
      }
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (recordingStatus === 'recording') {
      const transcript = await stopRecording();
      if (transcript) {
        try {
          await onTranscript(transcript);
        } catch (caughtError) {
          const message =
            caughtError instanceof Error
              ? caughtError.message
              : 'Couldn’t organize that just now.';

          if (mountedRef.current) {
            setError(message);
          }
        }
      }
      return;
    }

    if (recordingStatus === 'idle') {
      await startRecording();
    }
  }, [onTranscript, recordingStatus, startRecording, stopRecording]);

  return {
    recordingStatus,
    startRecording,
    stopRecording,
    toggleRecording,
    error,
  };
};
