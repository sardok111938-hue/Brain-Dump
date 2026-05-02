import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useHistory } from '@/hooks/useHistory';

export default function HistoryScreen() {
  const { historyGroups, deleteHistoryEntry } = useHistory();
  const router = useRouter();

  const formatter = useMemo(
  () =>
    new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  []
);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>
          Reopen any saved planning session and continue where you left off.
        </Text>

        {historyGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No saved sessions yet</Text>
            <Text style={styles.emptyText}>
              Organize your first brain dump to start building a history.
            </Text>
          </View>
        ) : (
          historyGroups.map((group) => (
            <View key={`${group.title}-${group.items.length}`} style={styles.group}>
              <Text style={styles.groupLabel}>{group.title}</Text>
              {group.items.map((item) => {
                const completedCount = item.result.tasks.filter((task) => task.completed).length;
                const activeCount = item.result.tasks.filter((task) => !task.completed).length;
                const totalCount = item.result.tasks.length;
                const previewText =
                  item.result.tasks.length > 0
                    ? item.result.tasks.slice(0, 4).map((task) => task.text).join(' • ')
                    : item.input.trim();
                const completionPercent =
                  totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
                const statusLabel =
                  completedCount === 0
                    ? 'Not started'
                    : completedCount === totalCount
                      ? 'All done'
                      : 'In progress';

                return (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      router.push({
                        pathname: '/',
                        params: {
                          selectedTimestamp: String(item.timestamp),
                          selectedHistoryId: item.id,
                          selectionKey: `${item.timestamp}-${Date.now()}`,
                        },
                      })
                    }
                    style={({ pressed }) => [
                      styles.card,
                      statusLabel === 'In progress' && styles.cardActive,
                      statusLabel === 'All done' && styles.cardCompleted,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.timestamp}>{formatter.format(new Date(item.timestamp))}</Text>
                      <View style={styles.headerActions}>
                        <Text style={styles.sourcePill}>
                          {item.source === 'voice' ? 'Voice' : 'Text'}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete session"
                          hitSlop={8}
                          onPress={(event) => {
                            event.stopPropagation();
                            Alert.alert('Delete session?', 'This cannot be undone.', [
                              {
                                text: 'Cancel',
                                style: 'cancel',
                              },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => {
                                  void deleteHistoryEntry(item.id);
                                },
                              },
                            ]);
                          }}
                          style={({ pressed }) => [
                            styles.deleteButton,
                            pressed && styles.deleteButtonPressed,
                          ]}
                        >
                          <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={styles.preview} numberOfLines={2}>
                      {previewText}
                    </Text>

                    <View style={styles.progressTrack}>
  <View
  style={[
    styles.progressFill,
    { width: `${completionPercent}%` },
    statusLabel === 'In progress' && { backgroundColor: '#F97316' },
    statusLabel === 'All done' && { backgroundColor: '#10B981' },
  ]}
/>
</View>

<View style={styles.footerRow}>
  <Text style={styles.meta}>
    {completedCount === totalCount
      ? `${totalCount}/${totalCount} done`
      : `${completedCount}/${totalCount} done · ${activeCount} left`}
  </Text>

<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  {statusLabel === 'All done' && (
    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
  )}
  <Text
    style={[
      styles.statusLabel,
      statusLabel === 'All done' && { color: '#047857' },
    ]}
  >
    {statusLabel}
  </Text>
</View></View>


                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F4F7FB',
    paddingBottom: 140,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    marginBottom: 24,
    maxWidth: '92%',
  },
  group: {
    marginBottom: 24,
  },
  groupLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 22,
  paddingVertical: 16,
  paddingHorizontal: 16,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.05,
  shadowRadius: 20,
  elevation: 3,
  marginBottom: 12,
},
footerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
cardActive: {
  borderColor: '#F97316',
  backgroundColor: '#FFF7ED',
},
  cardPressed: {
    opacity: 0.88,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardCompleted: {
  backgroundColor: '#ECFDF5',
  borderColor: '#34D399',
},
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcePill: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonPressed: {
    opacity: 0.82,
  },
  preview: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 12,
  },
  timestamp: {
    color: '#94A3B8',
    fontSize: 12,
  },
  meta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  statusLabel: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
  height: 4,
  borderRadius: 999,
  backgroundColor: '#E2E8F0',
  overflow: 'hidden',
  marginBottom: 8,
},
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#94A3B8',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },                                                   
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
});
