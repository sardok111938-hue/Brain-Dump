import { useCallback, useState } from 'react';

export const useSupportPopup = () => {
  const [visible, setVisible] = useState(false);

  const showSupportPopup = useCallback(() => {
    setVisible(true);
  }, []);

  const closeSupportPopup = useCallback(() => {
    setVisible(false);
  }, []);

  const markSupportPopupShown = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    supportPopupVisible: visible,
    closeSupportPopup,
    markSupportPopupShown,
    showSupportPopup,
  };
};