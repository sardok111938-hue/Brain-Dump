import { memo } from 'react';
import { GestureResponderEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type SupportAmount = 2 | 5 | 10;

type SupportPopupProps = {
  visible: boolean;
  onClose: () => void;
  onMaybeLater: () => void;
  onSupport: (amount: SupportAmount) => void;
};

const SUPPORT_AMOUNTS: SupportAmount[] = [2, 5, 10];

export const SupportPopup = memo(
  ({ visible, onClose, onMaybeLater, onSupport }: SupportPopupProps) => {
    const stopPropagation = (event: GestureResponderEvent) => {
      event.stopPropagation();
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onMaybeLater}>
          <Pressable style={styles.card} onPress={stopPropagation}>
            <Text style={styles.heart}>💛</Text>
            <Text style={styles.title}>Support Brain Dump</Text>
            <Text style={styles.body}>
              If Brain Dump helped you feel clearer today, you can support the app.
            </Text>

            <View style={styles.amountRow}>
              {SUPPORT_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  accessibilityRole="button"
                  accessibilityLabel={`Support Brain Dump with ${amount} pounds`}
                  onPress={() => onSupport(amount)}
                  style={({ pressed }) => [
                    styles.amountButton,
                    pressed && styles.amountButtonPressed,
                  ]}
                >
                  <Text style={styles.amountText}>£{amount}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Maybe later"
              onPress={onMaybeLater}
              style={({ pressed }) => [styles.laterButton, pressed && styles.laterButtonPressed]}
            >
              <Text style={styles.laterText}>Maybe later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
);

SupportPopup.displayName = 'SupportPopup';

export type { SupportAmount, SupportPopupProps };

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  heart: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  amountButton: {
    flex: 1,
    marginHorizontal: 5,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  amountButtonPressed: {
    opacity: 0.84,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  laterButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  laterButtonPressed: {
    opacity: 0.7,
  },
  laterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
