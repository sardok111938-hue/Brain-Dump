import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const Onboarding = ({ onContinue }: { onContinue: () => void }) => {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoBubble}>
          <Text style={styles.logo}>🧠</Text>
        </View>

        <Text style={styles.title}>Brain Dump</Text>
        <Text style={styles.subtitle}>
          Organize your day.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.point}>
          <View style={styles.iconBubble}>
            <Ionicons name="create-outline" size={18} color="#0F766E" />
          </View>
          <Text style={styles.pointText}>Write or speak what’s on your mind</Text>
        </View>

        <View style={styles.point}>
          <View style={styles.iconBubble}>
            <Ionicons name="sparkles-outline" size={18} color="#0F766E" />
          </View>
          <Text style={styles.pointText}>Get instantly organized into tasks</Text>
        </View>

        <View style={styles.point}>
          <View style={styles.iconBubble}>
            <Ionicons name="radio-button-on-outline" size={18} color="#0F766E" />
          </View>
          <Text style={styles.pointText}>Focus on one thing at a time</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Get started"
        onPress={onContinue}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Get started</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Pressable>

      <Text style={styles.footer}>No account. No clutter. Just clarity.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 24,
    paddingTop: 76,
    paddingBottom: 34,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
  },
  logoBubble: {
    width: 94,
    height: 94,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    shadowColor: '#F97316',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#64748B',
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#334155',
  },
  button: {
    height: 56,
    borderRadius: 24,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#0F766E',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#94A3B8',
  },
});