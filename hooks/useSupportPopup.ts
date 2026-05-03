import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_OPEN_KEY = 'support_first_open';
const LAST_SHOWN_KEY = 'support_last_shown';
const SUCCESS_COUNT_KEY = 'support_success_count';

const DAY_MS = 24 * 60 * 60 * 1000;
const SUPPORT_POPUP_DELAY_DAYS = 10;
const MIN_SUCCESS_COUNT = 10;

export const useSupportPopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const init = async () => {
      const existing = await AsyncStorage.getItem(FIRST_OPEN_KEY);

      if (!existing) {
        await AsyncStorage.setItem(FIRST_OPEN_KEY, Date.now().toString());
      }
    };

    void init();
  }, []);

  const showSupportPopup = useCallback(async () => {
    const now = Date.now();

    const [firstOpenRaw, lastShownRaw, successCountRaw] = await Promise.all([
      AsyncStorage.getItem(FIRST_OPEN_KEY),
      AsyncStorage.getItem(LAST_SHOWN_KEY),
      AsyncStorage.getItem(SUCCESS_COUNT_KEY),
    ]);

    const firstOpen = firstOpenRaw ? Number(firstOpenRaw) : now;
    const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
    const successCount = successCountRaw ? Number(successCountRaw) : 0;

    const daysSinceFirstOpen = Math.floor((now - firstOpen) / DAY_MS);
    const daysSinceLastShown = Math.floor((now - lastShown) / DAY_MS);

    if (daysSinceFirstOpen < SUPPORT_POPUP_DELAY_DAYS) return;
    if (successCount < MIN_SUCCESS_COUNT) return;
    if (daysSinceLastShown < 1) return;

    setVisible(true);
  }, []);

  const registerSuccessfulSession = useCallback(async () => {
    const countRaw = await AsyncStorage.getItem(SUCCESS_COUNT_KEY);
    const count = countRaw ? Number(countRaw) : 0;
    const nextCount = count + 1;

    await AsyncStorage.setItem(SUCCESS_COUNT_KEY, nextCount.toString());
    await showSupportPopup();
  }, [showSupportPopup]);

  const markSupportPopupShown = useCallback(async () => {
    setVisible(false);
    await AsyncStorage.setItem(LAST_SHOWN_KEY, Date.now().toString());
  }, []);

  return {
    supportPopupVisible: visible,
    closeSupportPopup: markSupportPopupShown,
    markSupportPopupShown,
    registerSuccessfulSession,
  };
};