import { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export const LoadingOverlay = memo(() => (
  <View style={styles.wrapper} accessibilityRole="progressbar">
    <ActivityIndicator size="small" color="#0F766E" />
    <Text style={styles.text}>Sorting things out...</Text>
  </View>
));

LoadingOverlay.displayName = 'LoadingOverlay';

const styles = StyleSheet.create({
wrapper: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#ECFEFF',
  borderRadius: 16,
  paddingVertical: 12,
  paddingHorizontal: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#CCFBF1',
},

text: {
  marginLeft: 10,
  color: '#0F766E',
  fontSize: 14,
  fontWeight: '600',
},
});
