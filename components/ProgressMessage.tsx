import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface ProgressMessageProps {
  message: string;
}

export const ProgressMessage = memo(({ message }: ProgressMessageProps) => (
  <View style={styles.wrapper}>
    <Ionicons
      name="flash"
      size={16}
      color="#0F766E"
    />
    <Text style={styles.text}>{message}</Text>
  </View>
));

ProgressMessage.displayName = 'ProgressMessage';

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#ECFEFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  text: {
    marginLeft: 8,
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});