import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

type HistoryItem = {
  input: string;
  result: any;
  timestamp: number;
};

const HISTORY_KEY = "brainDumpHistory";

export default function HomeScreen() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [recording, setRecording] = useState<any>(null);
  const [recordingStatus, setRecordingStatus] = useState("idle");
  const [loading, setLoading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [todayUsage, setTodayUsage] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;
  const emptyOpacity = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    if (result) {
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      cardOpacity.setValue(0);
    }
  }, [result, cardOpacity]);

  useEffect(() => {
    Animated.timing(loadingOpacity, {
      toValue: loading ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [loading, loadingOpacity]);

  useEffect(() => {
    if (recordingStatus === "recording") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, {
            toValue: 1.06,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(recordingPulse, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      loop.start();
      return () => loop.stop();
    }

    recordingPulse.setValue(1);
  }, [recordingStatus, recordingPulse]);

  const params = useLocalSearchParams<{ selectedTimestamp?: string }>();

  const loadHistory = async () => {
    try {
      const json = await AsyncStorage.getItem(HISTORY_KEY);
      if (json) {
        const stored: HistoryItem[] = JSON.parse(json);
        const sorted = stored.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(sorted);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const calculateStreak = (historyItems: HistoryItem[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasEntryToday = historyItems.some(item => {
      const itemDate = new Date(item.timestamp);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === today.getTime();
    });

    setTodayUsage(hasEntryToday);

    if (!hasEntryToday) {
      setStreak(0);
      return;
    }

    let currentStreak = 1;
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
      const hasEntry = historyItems.some(item => {
        const itemDate = new Date(item.timestamp);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === checkDate.getTime();
      });
      if (!hasEntry) break;
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    setStreak(currentStreak);
  };

useEffect(() => {
  loadHistory();
}, []);

useEffect(() => {
  if (history.length > 0) {
    calculateStreak(history);
  } else {
    setTodayUsage(false);
    setStreak(0);
  }
}, [history]);

  useEffect(() => {
    if (!history.length || !params.selectedTimestamp) {
      return;
    }

    const selectedId = Number(params.selectedTimestamp);
    const selected = history.find((item) => item.timestamp === selectedId);
    if (selected) {
      loadHistoryResult(selected);
    }
  }, [history, params.selectedTimestamp]);

  useEffect(() => {
    setProgressMessage(null);
  }, [input]);

  useEffect(() => {
    Animated.timing(emptyOpacity, {
      toValue: (!result && !loading) ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [result, loading, emptyOpacity]);


  const saveHistory = async (items: HistoryItem[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  };

const addHistoryEntry = async (entry: HistoryItem) => {
  setHistory((prev) => {
    const nextHistory = [entry, ...prev].slice(0, 20);
    saveHistory(nextHistory);
    return nextHistory;
  });
};
  const loadHistoryResult = (item: HistoryItem) => {
    setInput(item.input);
    setResult(item.result);
    setCompletedTasks([]);
  };

  const organizeText = async (text: string) => {
    try {
      setLoading(true);
      await Haptics.selectionAsync();
      const response = await fetch("http://192.168.0.62:3000/organize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      setResult(data);
      setCompletedTasks([]);
      const timestamp = Date.now();
      const newEntry = { input: text, result: data, timestamp };
      await addHistoryEntry(newEntry);


      // Set progress message
      const taskCount = data.tasks ? data.tasks.length : 0;
      setProgressMessage(`You’ve planned ${taskCount} tasks today`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🎙️ Start Recording
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setRecordingStatus("recording");
      await Haptics.selectionAsync();
    } catch (err) {
      console.error("Start recording error:", err);
    }
  };

  // ⏹ Stop Recording → Transcribe → Auto Organize
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setRecordingStatus("stopped");
      await Haptics.selectionAsync();
      setLoading(true);
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();

      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "recording.m4a",
        type: "audio/mp4",
      } as any);

      const response = await fetch("http://192.168.0.62:3000/transcribe", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();

      setInput(data.text);

      // auto organize
      await organizeText(data.text);

      setRecording(null);
    } catch (err) {
      console.error("Stop recording error:", err);
      setLoading(false);
    }
  };

  // 🧠 Organize (manual)
  const handleOrganize = async () => {
    await organizeText(input);
  };

  // 🔥 Organize helper
  const handleOrganizeWithText = async (text: string) => {
    await organizeText(text);
  };

  const toggleTaskCompleted = (index: number) => {
    setCompletedTasks((prev) =>
      prev.includes(index)
        ? prev.filter((item) => item !== index)
        : [...prev, index]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Brain Dump</Text>
        <Text style={styles.subtitle}>
          Capture your thoughts, organize them clearly, and revisit your best ideas.
        </Text>
        <Text style={styles.greeting}>
          {todayUsage ? `You're on a ${streak} day streak 🔥` : "Start your day — dump everything"}
        </Text>
      </View>

      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          placeholder="Type your thoughts..."
          placeholderTextColor="#94a3b8"
          multiline
          value={input}
          onChangeText={setInput}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            loading && styles.disabledButton,
          ]}
          onPress={handleOrganize}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Processing..." : "Organize"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.micButton,
            recordingStatus === "recording" && styles.micActive,
            pressed && styles.buttonPressed,
            loading && styles.disabledButton,
          ]}
          onPress={
            recordingStatus === "recording" ? stopRecording : startRecording
          }
          disabled={loading}
        >
          <Animated.View
            style={[
              styles.micInner,
              recordingStatus === "recording" && styles.micInnerActive,
              { transform: [{ scale: recordingPulse }] },
            ]}
          >
            <Text style={styles.micText}>
              {recordingStatus === "recording" ? "⏹ Recording..." : "🎙️ Hold to speak"}
            </Text>
          </Animated.View>
        </Pressable>
      </View>

      <Animated.View style={[styles.loadingOverlay, { opacity: loadingOpacity }]}> 
        <ActivityIndicator size="large" color="#6366F1" />
      </Animated.View>

      {progressMessage && (
        <View style={styles.progressMessage}>
          <Text style={styles.progressText}>{progressMessage}</Text>
        </View>
      )}

      {!result && !loading && (
        <Animated.View style={[styles.emptyState, { opacity: emptyOpacity }]}>
          <Text style={styles.emptyEmoji}>🧠</Text>
          <Text style={styles.emptyTitle}>Clear your mind</Text>
          <Text style={styles.emptyText}>Write anything on your mind — we’ll organize it into clear tasks.</Text>
        </Animated.View>
      )}

      {result && (
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [
                {
                  scale: cardOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Tasks</Text>
          {result.tasks.map((task: string, i: number) => {
            const completed = completedTasks.includes(i);
            return (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.taskRow, pressed && styles.taskPressed]}
                onPress={() => toggleTaskCompleted(i)}
              >
                <Text style={[styles.checkbox, completed && styles.checkboxChecked]}>
                  {completed ? "☑" : "☐"}
                </Text>
                <Text style={[styles.taskText, completed && styles.taskTextCompleted]}>
                  {task}
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Plan</Text>
            {Object.entries(result.plan).map(([category, tasks]: any) => (
              <View key={category} style={styles.sectionGroup}>
                <Text style={styles.category}>{category}</Text>
                {tasks.map((t: string, i: number) => (
                  <Text key={i} style={styles.item}>
                    - {t}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Priorities</Text>
            {Object.entries(result.priorities).map(([level, tasks]: any) => (
              <View key={level} style={styles.sectionGroup}>
                <Text style={styles.category}>{level}</Text>
                {tasks.map((t: string, i: number) => (
                  <Text key={i} style={styles.item}>
                    - {t}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </Animated.View>
      )}
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
    maxWidth: "90%",
  },
  greeting: {
    color: "#22C55E",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  inputCard: {
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
  input: {
    minHeight: 150,
    fontSize: 16,
    color: "#0F172A",
    lineHeight: 24,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  micButton: {
    borderRadius: 18,
  },
  micActive: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  micInner: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 130,
  },
  micInnerActive: {
    backgroundColor: "#EF4444",
  },
  micText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  loadingOverlay: {
    marginBottom: 16,
    alignItems: "center",
  },
  progressMessage: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  progressText: {
    color: "#166534",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
    marginTop: 30,
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 34,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: "85%",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 10,
  },
  sectionBlock: {
    marginTop: 22,
  },
  sectionGroup: {
    marginTop: 10,
  },
  category: {
    fontWeight: "700",
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 6,
  },
  item: {
    color: "#334155",
    marginLeft: 10,
    marginBottom: 6,
    fontSize: 15,
    lineHeight: 22,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    marginTop: 12,
  },
  taskPressed: {
    opacity: 0.8,
  },
  cardPressed: {
    opacity: 0.92,
  },
  checkbox: {
    fontSize: 18,
    marginRight: 14,
    color: "#6366F1",
  },
  checkboxChecked: {
    color: "#22C55E",
  },
  taskText: {
    fontSize: 15,
    color: "#0F172A",
    flex: 1,
    lineHeight: 22,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.55,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
});
