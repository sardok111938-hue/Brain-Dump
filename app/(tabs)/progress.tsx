import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type HistoryItem = {
  input: string;
  result: any;
  timestamp: number;
};

const HISTORY_KEY = "brainDumpHistory";

export default function ProgressScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [weeklyTasks, setWeeklyTasks] = useState(0);
  const [weeklyDays, setWeeklyDays] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const json = await AsyncStorage.getItem(HISTORY_KEY);
      if (json) {
        const stored: HistoryItem[] = JSON.parse(json);
        setHistory(stored);
        calculateStats(stored);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const calculateStats = (items: HistoryItem[]) => {
    setTotalEntries(items.length);

    let tasks = 0;
    items.forEach((item) => {
      if (item.result && item.result.tasks) {
        tasks += item.result.tasks.length;
      }
    });
    setTotalTasks(tasks);

    // Calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasEntryToday = items.some((item) => {
      const itemDate = new Date(item.timestamp);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === today.getTime();
    });

    if (!hasEntryToday) {
      setStreak(0);
    } else {
      let currentStreak = 1;
      let checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const hasEntry = items.some((item) => {
          const itemDate = new Date(item.timestamp);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === checkDate.getTime();
        });
        if (!hasEntry) break;
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
      setStreak(currentStreak);
    }

    // Weekly
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyItems = items.filter(
      (item) => new Date(item.timestamp) >= weekAgo
    );
    const uniqueDays = new Set<number>();
    let weekTasks = 0;
    weeklyItems.forEach((item) => {
      const date = new Date(item.timestamp);
      date.setHours(0, 0, 0, 0);
      uniqueDays.add(date.getTime());
      if (item.result && item.result.tasks) {
        weekTasks += item.result.tasks.length;
      }
    });
    setWeeklyDays(uniqueDays.size);
    setWeeklyTasks(weekTasks);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>Track your daily brain dump habits</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statLabel}>Current Streak</Text>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakUnit}>days</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.miniCard}>
          <Text style={styles.miniNumber}>{totalEntries}</Text>
          <Text style={styles.miniLabel}>Total Entries</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniNumber}>{totalTasks}</Text>
          <Text style={styles.miniLabel}>Total Tasks</Text>
        </View>
      </View>

      <View style={styles.weeklyCard}>
        <Text style={styles.weeklyTitle}>This Week</Text>
        <Text style={styles.weeklyText}>You planned {weeklyTasks} tasks</Text>
        <Text style={styles.weeklyText}>You used the app {weeklyDays} days</Text>
      </View>

      <View style={styles.visualCard}>
        <Text style={styles.visualTitle}>Daily Tasks (Last 7 Days)</Text>
        {Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const dayItems = history.filter((item) => {
            const itemDate = new Date(item.timestamp);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === date.getTime();
          });
          const dayTasks = dayItems.reduce(
            (sum, item) => sum + (item.result?.tasks?.length || 0),
            0
          );
          const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
          return (
            <View key={i} style={styles.dayRow}>
              <Text style={styles.dayName}>{dayName}</Text>
              <Text style={styles.dayTasks}>{dayTasks} tasks</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#F8FAFC",
    flexGrow: 1,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    color: "#64748B",
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
    marginBottom: 18,
  },
  statLabel: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 64,
    fontWeight: "800",
    color: "#22C55E",
  },
  streakUnit: {
    fontSize: 18,
    color: "#64748B",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  miniCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  miniNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
  },
  miniLabel: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  weeklyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 18,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  weeklyText: {
    fontSize: 15,
    color: "#334155",
    marginBottom: 6,
  },
  visualCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  visualTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  dayName: {
    fontSize: 15,
    color: "#0F172A",
  },
  dayTasks: {
    fontSize: 15,
    color: "#64748B",
  },
});