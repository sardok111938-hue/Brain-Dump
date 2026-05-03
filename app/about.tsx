import { Text, StyleSheet, ScrollView, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function HelpScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
  <Text style={styles.closeText}>×</Text>
</Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>How Brain Dump works.</Text>
          <Text style={styles.subtitle}>
            Keep it simple. Empty your head, then follow one clear step.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick start</Text>

          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Write everything on your mind</Text>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Tap organize</Text>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Focus on one task at a time</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Helpful tips</Text>

          <Text style={styles.tip}>• Don’t try to be perfect — just dump it out.</Text>
          <Text style={styles.tip}>• Use Focus Mode when everything feels too much.</Text>
          <Text style={styles.tip}>• Short sessions are enough. Come back anytime.</Text>
        </View>

        <View style={styles.calmCard}>
          <Text style={styles.calmText}>You don’t need a perfect plan. Just a next step.</Text>
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyEmoji}>🔒</Text>
          <Text style={styles.privacyTitle}>Your thoughts are yours</Text>

          <Text style={styles.privacyText}>
            Brain Dump stores your entries on your device.
          </Text>

          <Text style={styles.privacyText}>
            When you tap “Organize” or use Speak, your words are sent securely to an AI
            service to turn them into suggestions.
          </Text>

          <Text style={styles.privacyText}>
            We don’t store your entries or recordings ourselves, and you can clear your data
            anytime.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  closeButton: {
  position: 'absolute',
  top: 40                                                              ,
  right: 20,
  zIndex: 10,
  padding: 10,
},
  closeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#64748B',
  },
  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  heroCard: {
  backgroundColor: '#FFF7ED',
  borderRadius: 28,
  padding: 24,
  marginTop: 32,
  marginBottom: 18,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
    color: '#C2410C',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    color: '#3730A3',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontWeight: '900',
    marginRight: 10,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#475569',
  },
  tip: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  calmCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 14,
  },
  calmText: {
    color: '#3730A3',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '900',
  },
  privacyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  privacyEmoji: {
    fontSize: 26,
    marginBottom: 8,
  },
  privacyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
});