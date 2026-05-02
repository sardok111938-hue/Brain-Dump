import {
  SafeAreaView,
  Text,
  StyleSheet,
  Linking,
  View,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function ContactScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.emoji}>💬</Text>
          <Text style={styles.title}>Contact</Text>
          <Text style={styles.subtitle}>
            We’re listening. Tell us what would help you.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.text}>
            Have feedback, ideas, or something not working right?{" "}
            {"We'd genuinely love to hear from you."}
          </Text>
        </View>

        <Pressable
          style={styles.emailCard}
          onPress={() => {
            Linking.openURL('mailto:sardok75@gmail.com').catch(() => {
              Alert.alert('Could not open mail app');
            });
          }}
        >
          <Text style={styles.emailLabel}>Email</Text>
          <Text style={styles.email}>sardok75@gmail.com</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  closeButton: {
    position: 'absolute',
    top: 54,
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
  },

  heroCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 28,
    padding: 24,
    marginTop: 32,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  emoji: {
    fontSize: 40,
    marginBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: '#C2410C',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  text: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    color: '#475569',
  },

  emailCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  emailLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    marginBottom: 4,
  },

  email: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3730A3',
  },
});