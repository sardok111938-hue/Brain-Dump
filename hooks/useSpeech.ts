import * as Speech from 'expo-speech';
import { useCallback, useState } from 'react';

export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;

    if (isSpeaking) {
      Speech.stop();
      return; // let onDone handle state reset
    }

    setIsSpeaking(true);

    try {
      Speech.speak(text, {
        language: 'en',
        pitch: 1,
        rate: 0.8,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
  };
};