import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage = memo(({ message }: ErrorMessageProps) => (
  <View style={styles.wrapper}>
    <Ionicons name="alert-circle-outline" size={16} color="#991B1B" />
    <Text style={styles.text}>{message}</Text>
  </View>
));

ErrorMessage.displayName = 'ErrorMessage';

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  text: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
});