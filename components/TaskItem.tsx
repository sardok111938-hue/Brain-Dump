import { memo } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { Task, TaskPriority } from '@/types';

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  onToggle: () => void;
  onDrag: () => void;
  onSetPriority: (priority?: TaskPriority) => void;
}

export const TaskItem = memo(
  ({ task, isActive, onToggle, onDrag, onSetPriority }: TaskItemProps) => {
    const handleCyclePriority = () => {
      const nextPriority =
        task.priority === undefined
          ? 'high'
          : task.priority === 'high'
            ? 'low'
            : undefined;

      onSetPriority(nextPriority);
    };

    return (
      <Pressable
        disabled={task.completed}
        style={[
          styles.row,
          task.priority === 'high' && !task.completed && styles.rowHighPriority,
          task.priority === 'low' && !task.completed && styles.rowLowPriority,
          task.completed && styles.rowCompleted,
          isActive && styles.rowActive,
        ]}
      >
        <View style={styles.leading}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={
              task.completed ? `Mark ${task.text} incomplete` : `Mark ${task.text} complete`
            }
            accessibilityState={{ checked: task.completed }}
            hitSlop={8}
            onPress={(event: GestureResponderEvent) => {
              event.stopPropagation();
              onToggle();
            }}
            style={[styles.checkWrap, task.completed && styles.checkWrapCompleted]}
          >
            <Ionicons
              name={task.completed ? 'checkmark' : 'ellipse-outline'}
              size={task.completed ? 17 : 22}
              color={task.completed ? '#FFFFFF' : '#94A3B8'}
            />
          </Pressable>

          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.taskText, task.completed && styles.taskTextCompleted]}
                numberOfLines={3}
              >
                {task.text}
              </Text>

              <Pressable
  accessibilityRole="button"
  accessibilityLabel={`Set priority for ${task.text}`}
  onPress={(e) => {
    e.stopPropagation();
    handleCyclePriority();
  }}
  style={({ pressed }) => [
    styles.priorityButton,
    pressed && styles.priorityButtonPressed,
  ]}
>
  <Text style={styles.priorityIcon}>
    {task.priority === 'high'
      ? '🔥'
      : task.priority === 'low'
      ? '❄️'
      : '⚪️'}
  </Text>
</Pressable>


              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reorder ${task.text}`}
                accessibilityHint="Long press and drag to change task order"
                delayLongPress={120}
                onLongPress={onDrag}
                hitSlop={8}
                style={({ pressed }) => [styles.dragHandle, pressed && styles.dragHandlePressed]}
              >
                <Feather name="menu" size={18} color="#94A3B8" />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }
);

TaskItem.displayName = 'TaskItem';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    elevation: 2,
  },
  rowHighPriority: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
    shadowColor: '#F97316',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  rowLowPriority: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  rowCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  rowActive: {
    opacity: 0.96,
    transform: [{ scale: 1.025 }],
    borderColor: '#14B8A6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 10,
  },
  checkWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  checkWrapCompleted: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  textWrap: {
    flex: 1,
    marginLeft: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#0F172A',
    fontWeight: '600',
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
    fontWeight: '600',
  },
  priorityIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  dragHandle: {
    width: 40,
    height: 40,
    marginLeft: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dragHandlePressed: {
    opacity: 0.8,
  },
  priorityButton: {
  marginLeft: 8,
  paddingHorizontal: 6,
  paddingVertical: 4,
  borderRadius: 10,
},

priorityButtonPressed: {
  opacity: 0.7,
},

priorityIcon: {
  fontSize: 16,
},
});
