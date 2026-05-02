import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHistory } from '@/hooks/useHistory';

const WEEKLY_TREND_LABELS = {
  up: 'Improving',
  down: 'Dropping',
  flat: 'Stable',
  none: 'Not enough data',
} as const;

export default function ProgressScreen() {
  const { progressStats } = useHistory();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>Small wins add up. Keep your momentum going.</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <Text style={styles.heroEmoji}>🔥</Text>
          <Text style={styles.heroLabel}>Current streak</Text>
          <Text style={styles.heroNumber}>{progressStats.streak}</Text>
          <Text style={styles.heroFootnote}>
            {progressStats.todayUsage ? 'You showed up today. Nice.' : 'Log a session today to keep it moving.'}
          </Text>
        </View>

        <View style={styles.grid}>
          <StatCard value={progressStats.totalEntries} label="Sessions" tone="teal" />
          <StatCard value={progressStats.totalTasks} label="Planned" tone="amber" />
          <StatCard value={progressStats.completedTasks} label="Completed" tone="green" />
          <StatCard value={`${progressStats.completionRate}%`} label="Rate" tone="blue" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>This week</Text>
          <Text style={styles.cardText}>
            {progressStats.weeklyTasks} tasks planned in the last 7 days.
          </Text>
          <Text style={styles.cardText}>
            {progressStats.weeklyDays} active days with at least one saved session.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>

          <Insight label="Best streak" value={`${progressStats.bestStreak} days`} />
          <Insight label="Avg tasks / session" value={progressStats.averageTasksPerSession.toFixed(1)} />
          <Insight label="Most productive day" value={progressStats.mostProductiveDay ?? 'No completed tasks yet'} />
          <Insight
            label="Voice vs text"
            value={`${progressStats.voiceSessionCount} voice · ${progressStats.textSessionCount} text`}
          />
          <Insight label="Weekly trend" value={WEEKLY_TREND_LABELS[progressStats.weeklyCompletionTrend]} last />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 days</Text>

          {progressStats.dailyBreakdown.map((day) => (
            <View key={day.dateKey} style={styles.dayRow}>
              <Text style={styles.dayLabel}>{day.label}</Text>

              <View style={styles.dayMetric}>
                <Text style={styles.dayTasks}>{day.taskCount} tasks</Text>
                <Text style={styles.dayCompleted}>{day.completedCount} done</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: 'teal' | 'amber' | 'green' | 'blue';
}) {
  return (
    <View style={[styles.statCard, styles[`statCard_${tone}`]]}>
      <Text style={[styles.statValue, styles[`statValue_${tone}`]]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Insight({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.insightRow, last && styles.insightRowLast]}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
  flex: 1,
  backgroundColor: '#F4F7FB',
},

container: {
  padding: 20,
  paddingBottom: 130,
  backgroundColor: '#F4F7FB',
},

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.7,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14.5,
    lineHeight: 21,
    color: '#64748B',
    fontWeight: '600',
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 5,
  },

  heroGlowOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -55,
    right: -45,
    backgroundColor: '#FDE68A',
    opacity: 0.75,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -50,
    left: -35,
    backgroundColor: '#A7F3D0',
    opacity: 0.8,
  },

  heroEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },

  heroLabel: {
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  heroNumber: {
    fontSize: 62,
    fontWeight: '900',
    color: '#0F766E',
    lineHeight: 70,
    letterSpacing: -1,
  },

  heroFootnote: {
    marginTop: 2,
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '700',
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    width: '48%',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
  },

  statCard_teal: {
    backgroundColor: '#ECFEFF',
    borderColor: '#99F6E4',
  },

  statCard_amber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },

  statCard_green: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },

  statCard_blue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },

  statValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  statValue_teal: {
    color: '#0F766E',
  },

  statValue_amber: {
    color: '#D97706',
  },

  statValue_green: {
    color: '#16A34A',
  },

  statValue_blue: {
    color: '#2563EB',
  },

  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 16,
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.055,
    shadowRadius: 18,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 9,
    letterSpacing: -0.2,
  },

  cardText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 5,
    fontWeight: '600',
  },

  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  insightRowLast: {
    borderBottomWidth: 0,
  },

  insightLabel: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '700',
  },

  insightValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
    maxWidth: '58%',
    textAlign: 'right',
  },

  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  dayLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },

  dayMetric: {
    alignItems: 'flex-end',
  },

  dayTasks: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
  },

  dayCompleted: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
});