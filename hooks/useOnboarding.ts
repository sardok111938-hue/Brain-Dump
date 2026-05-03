import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'has_seen_onboarding';

export const useOnboarding = () => {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      const value = await AsyncStorage.getItem(KEY);
      setHasSeen(value === 'true');
    };

    void load();
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(KEY, 'true');
    setHasSeen(true);
  };

  return { hasSeen, completeOnboarding };
};