import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

type HistoryItem = {
  input: string;
  result: any;
  timestamp: number;
};

const HISTORY_KEY = 'brainDumpHistory';

const formatGroupLabel = (timestamp: number) => {
  const itemDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(itemDate, today)) {
    return 'Today';
  }

  if (isSameDay(itemDate, yesterday)) {
    return 'Yesterday';
  }

  return itemDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

const previewText = (input: string) =>
  input.trim().slice(0, 50) + (input.trim().length > 50 ? '…' : '');

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const json = await AsyncStorage.getItem(HISTORY_KEY);
        if (!json) {
          return;
        }

        const stored: HistoryItem[] = JSON.parse(json);
        setHistory(stored.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error('Unable to load history:', error);
      }
    };

    loadHistory();
  }, []);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {};

    history.forEach((item) => {
      const label = formatGroupLabel(item.timestamp);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(item);
    });

    return groups;
  }, [history]);

  const groupLabels = useMemo(
    () => Object.keys(groupedHistory),
    [groupedHistory]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>
        Review your saved entries and reopen any session in the Home tab.
      </Text>

      {groupLabels.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No history yet. Organize a brain dump to save it.</Text>
        </View>
      ) : (
        groupLabels.map((label) => (
          <View key={label} style={styles.group}>
            <Text style={styles.groupLabel}>{label}</Text>
            {groupedHistory[label].map((item, index) => (
              <Pressable
                key={item.timestamp}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                  index !== groupedHistory[label].length - 1 && styles.cardSpacing,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/',
                    params: { selectedTimestamp: item.timestamp.toString() },
                  })
                }
              >
                <Text style={styles.preview} numberOfLines={1}>
                  {previewText(item.input)}
                </Text>
                <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F8FAFC',
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
    marginBottom: 22,
    maxWidth: '92%',
  },
  group: {
    marginBottom: 22,
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
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  cardSpacing: {
    marginBottom: 10,
  },
  cardPressed: {
    opacity: 0.88,
  },
  preview: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  timestamp: {
    color: '#94A3B8',
    fontSize: 12,
  },
  emptyState: {
    paddingTop: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
});
