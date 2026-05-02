import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Task } from '@/types';

interface FocusCardProps {
  task: Task;
  started: boolean;
  timerLabel?: string;
  onStart: () => void;
  onDone: () => void;
  onViewAll?: () => void;
}

export const FocusCard = memo(
  ({ task, started, timerLabel, onStart, onDone, onViewAll }: FocusCardProps) => {
    const urgency = (() => {
      const text = task.text.toLowerCase();

      if (/\boverdue\b/.test(text)) return 'Overdue';
      if (/\bdue today\b|\btoday\b/.test(text)) return 'Due today';
      if (/\basap\b|\burgent\b|\bimmediately\b|\bnow\b/.test(text)) return 'Urgent';

      return null;
    })();

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>
            {started && timerLabel ? `In progress • ${timerLabel}` : 'Next up'}
          </Text>

          {urgency ? <Text style={styles.urgency}>{urgency}</Text> : null}
        </View>

        <Text style={styles.taskText}>{task.text}</Text>
        {task.reason ? <Text style={styles.reason}>Because {task.reason}</Text> : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={started ? `Mark ${task.text} complete` : `Start ${task.text}`}
            onPress={started ? onDone : onStart}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>{started ? 'Mark done' : 'Start'}</Text>
          </Pressable>

          {onViewAll ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all tasks"
              onPress={onViewAll}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.secondaryButtonText}>View all</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }
);

FocusCard.displayName = 'FocusCard';

const styles = StyleSheet.create({
  card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 24,
  borderWidth: 1,
  borderColor: '#FED7AA',
  shadowColor: '#F97316',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
  borderLeftWidth: 4,
  borderLeftColor: '#F97316',
  marginBottom: 16,
},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
  fontSize: 12,
  fontWeight: '700',
  color: '#F97316',
  textTransform: 'uppercase',
  letterSpacing: 0.5, // 👈 smoother feel
},
  urgency: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
  },
  taskText: {
  fontSize: 24,
  lineHeight: 32,
  color: '#0F172A',
  fontWeight: '800',
  marginTop: 6,      // 👈 add this
  marginBottom: 16,
},
  reason: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -8,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
  flex: 1,
  minHeight: 50,
  borderRadius: 18,
  backgroundColor: '#F97316',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 14,
  paddingVertical: 12,
},
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.86,
  },
});
