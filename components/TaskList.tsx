import { memo, useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

import { Task, TaskPriority } from '@/types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  pendingCompleteIds?: string[];
  onReorder: (data: Task[]) => void;
  onToggleTask: (taskId: string) => void;
  onSetTaskPriority: (taskId: string, priority?: TaskPriority) => void;
  ListHeaderComponent?: ReactElement | null;
}

export const TaskList = memo(
({
  tasks,
  pendingCompleteIds = [],
  onReorder,
  onToggleTask,
  onSetTaskPriority,
  ListHeaderComponent,
}: TaskListProps) => {
  
  const [completedExpanded, setCompletedExpanded] = useState(false);

    const activeTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);
    const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);

    const keyExtractor = useCallback((item: Task) => item.id, []);

    const renderCompletedHeader = useCallback(
      () =>
        completedTasks.length > 0 ? (
          <View style={styles.completedSection}>
            <Pressable
              onPress={() => setCompletedExpanded((value) => !value)}
              style={styles.completedToggle}
            >
              <Text style={styles.completedLabel}>Completed ({completedTasks.length})</Text>
              <Text style={styles.completedChevron}>{completedExpanded ? '▲' : '▼'}</Text>
            </Pressable>
          </View>
        ) : null,
      [completedExpanded, completedTasks.length]
    );

    const renderItem = useCallback(
  ({ item, drag, isActive }: RenderItemParams<Task>) => {
    return (
      <TaskItem
        task={item}
        isActive={isActive}
        isCompleting={pendingCompleteIds.includes(item.id)}
        onDrag={drag}
        onToggle={() => onToggleTask(item.id)}
        onSetPriority={(priority) => onSetTaskPriority(item.id, priority)}
      />
    );
  },
  [pendingCompleteIds, onSetTaskPriority, onToggleTask]
);

    const handleDragEnd = useCallback(
      ({ data }: { data: Task[] }) => {
        onReorder(data);
      },
      [onReorder]
    );

    const footer = useMemo(
      () => (
        <>
          {renderCompletedHeader()}

          {completedExpanded
            ? completedTasks.map((task) => (
                <View key={task.id} style={styles.completedItemWrap}>
                  <TaskItem
                    task={task}
                    isActive={false}
                    onDrag={() => {}}
                    onToggle={() => onToggleTask(task.id)}
                    onSetPriority={(priority) => onSetTaskPriority(task.id, priority)}
                  />
                </View>
              ))
            : null}
        </>
      ),
      [completedExpanded, completedTasks, onSetTaskPriority, onToggleTask, renderCompletedHeader]
    );

    return (
      <DraggableFlatList
        data={activeTasks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        activationDistance={8}
        autoscrollSpeed={220}
        contentContainerStyle={styles.container}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={footer}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
    );
  }
);

TaskList.displayName = 'TaskList';

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 140,
    backgroundColor: '#F4F7FB',
  },
  separator: {
    height: 10,
  },
  completedSection: {
    marginTop: 16,
    marginBottom: 10,
  },
  completedItemWrap: {
    marginBottom: 10,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  completedLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  completedChevron: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
});
