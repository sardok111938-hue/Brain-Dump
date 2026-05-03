import Constants from 'expo-constants';

import { OrganizeApiResponse, OrganizeMode, TranscribeApiResponse } from '@/types';

const REQUEST_TIMEOUT_MS = 25000;
const AUDIO_MIME_TYPE = 'audio/mp4';
const isProductionBuild =
  (typeof __DEV__ === 'boolean' && !__DEV__) || process.env.NODE_ENV === 'production';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  if (isProductionBuild) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is required in production builds. Localhost fallback is disabled.'
    );
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }

  return 'http://127.0.0.1:3000';
};

const API_BASE_URL = resolveApiBaseUrl();
const BACKEND_UNAVAILABLE_MESSAGES = [
  'Unable to reach the API',
  'The request timed out.',
  'Network request failed',
];

const connectAbortSignal = (
  signal: AbortSignal | null | undefined,
  controller: AbortController
) => {
  if (!signal) {
    return () => {};
  }

  if (signal.aborted) {
    controller.abort();
    return () => undefined;
  }

  const abortListener = () => controller.abort();
  signal.addEventListener('abort', abortListener, { once: true });
  return () => signal.removeEventListener('abort', abortListener);
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    try {
      const text = await response.text();
      if (text.trim()) {
        return text;
      }
    } catch {
      return `Request failed with status ${response.status}.`;
    }
  }

  return `Request failed with status ${response.status}.`;
};

const requestJson = async <T>(path: string, init: RequestInit = {}) => {
  const controller = new AbortController();
  const disconnectAbort = connectAbortSignal(init.signal, controller);
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    return (await response.json()) as T;
  } catch (error) {
    if (timedOut) {
      throw new Error('The request timed out. Check that the API server is running and reachable.');
    }

    if (error instanceof Error && error.message === 'Network request failed') {
      throw new Error(
        `Unable to reach the API at ${API_BASE_URL}. Set EXPO_PUBLIC_API_BASE_URL if your device cannot access localhost.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    disconnectAbort();
  }
};

type ReactNativeFile = Blob & {
  uri: string;
  name: string;
  type: string;
};

export const organizeTextApi = (text: string, mode: OrganizeMode, signal?: AbortSignal) =>
  requestJson<OrganizeApiResponse>('/organize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, mode }),
    signal,
  });

export const transcribeAudioApi = (uri: string, signal?: AbortSignal) => {
  const formData = new FormData();
  const file = {
    uri,
    name: `brain-dump-${Date.now()}.m4a`,
    type: AUDIO_MIME_TYPE,
  } as ReactNativeFile;

  formData.append('audio', file);

  return requestJson<TranscribeApiResponse>('/transcribe', {
    method: 'POST',
    body: formData,
    signal,
  });
};

export const isBackendUnavailableError = (error: unknown) =>
  error instanceof Error &&
  BACKEND_UNAVAILABLE_MESSAGES.some((message) => error.message.includes(message));
