import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RecordingStatus } from '@/types';

interface ControlsProps {
  onOrganize: () => void;
  organizeDisabled?: boolean;
  recordingDisabled?: boolean;
  loading?: boolean;
  recordingStatus: RecordingStatus;
  onRecordingToggle: () => void;
}

const recordingLabels: Record<RecordingStatus, string> = {
  idle: 'Speak',
  recording: 'Stop',
  transcribing: 'Transcribing',
};

export const Controls = memo(
  ({
    onOrganize,
    organizeDisabled = false,
    recordingDisabled = false,
    loading = false,
    recordingStatus,
    onRecordingToggle,
  }: ControlsProps) => {
    const label = loading
      ? 'Working...'
      : organizeDisabled
      ? 'Write'
      : 'Organize';

    return (
      <View style={styles.controls}>
        {/* ORGANIZE BUTTON */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loading ? 'Organizing your thoughts' : 'Organize thoughts'}
          disabled={organizeDisabled}
          onPress={onOrganize}
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            organizeDisabled && styles.buttonDisabled,
            pressed && !organizeDisabled && styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={organizeDisabled ? '#CBD5F5' : '#F8FAFC'}
          />
          <Text style={styles.primaryButtonText}>{label}</Text>
        </Pressable>

        {/* RECORD BUTTON */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            recordingStatus === 'recording' ? 'Stop recording' : 'Start voice recording'
          }
          disabled={recordingDisabled}
          onPress={onRecordingToggle}
          style={({ pressed }) => [
            styles.button,
            styles.secondaryButton,
            recordingStatus === 'recording' && styles.secondaryButtonActive,
            recordingDisabled && styles.buttonDisabled,
            pressed && !recordingDisabled && styles.buttonPressed,
          ]}
        >
          <Ionicons
            name={recordingStatus === 'recording' ? 'stop-circle' : 'mic'}
            size={16}
            color="#0F172A"
          />
          <Text style={styles.secondaryButtonText}>
            {recordingLabels[recordingStatus]}
          </Text>
        </Pressable>
      </View>
    );
  }
);

Controls.displayName = 'Controls';

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,      // 👈 subtle breathing space from input
    marginBottom: 22,
  },

  button: {
    flex: 1,
    height: 44,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },

  primaryButton: {
    backgroundColor: '#0F766E',
  },

  secondaryButton: {
    backgroundColor: '#E2E8F0',
  },

  secondaryButtonActive: {
    backgroundColor: '#FDE68A',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    minWidth: 60,
  },

  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16,
    minWidth: 60,
  },

  buttonDisabled: {
    opacity: 0.4, // 👈 clearer disabled state
  },

  buttonPressed: {
    opacity: 0.85,
  },
});