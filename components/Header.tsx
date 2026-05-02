import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface HeaderProps {
  streak: number;
  todayUsage: boolean;
  focusModeEnabled: boolean;
  onToggleFocus: () => void;
  onClearTasks: () => void;
}

export const Header = memo(
  ({ streak, todayUsage, focusModeEnabled, onToggleFocus, onClearTasks }: HeaderProps) => {
    const router = useRouter();
    
const [menuOpen, setMenuOpen] = useState(false);

const menu = menuOpen ? (
  <View style={styles.menu}>
    <Pressable
      onPress={() => {
        setMenuOpen(false);
        onToggleFocus();
      }}
    >
      <Text style={styles.menuItem}>
        {focusModeEnabled ? 'Exit Focus Mode' : 'Focus Mode'}
      </Text>
    </Pressable>

    <View style={styles.menuDivider} />

    <Pressable
      onPress={() => {
        setMenuOpen(false);
        router.push('/help');
      }}
    >
      <Text style={styles.menuItem}>Help</Text>
    </Pressable>

    <Pressable
      onPress={() => {
        setMenuOpen(false);
        router.push('/about');
      }}
    >
      <Text style={styles.menuItem}>About</Text>
    </Pressable>

    <Pressable
      onPress={() => {
        setMenuOpen(false);
        router.push('/contact');
      }}
    >
      <Text style={styles.menuItem}>Contact</Text>
    </Pressable>

    <View style={styles.menuDivider} />

    <Pressable
      onPress={() => {
        setMenuOpen(false);
        onClearTasks();
      }}
    >
      <Text style={styles.dangerMenuItem}>Clear current tasks</Text>
    </Pressable>
  </View>
) : null;

if (focusModeEnabled) {
  return (
    <View style={styles.container}>
      <View style={styles.simpleBrandRow}>
        <Text style={styles.simpleBrandTitle}>Brain Dump</Text>

        <Pressable
          onPress={() => setMenuOpen((value) => !value)}
          hitSlop={10}
          style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}
        >
          <Ionicons name="menu" size={22} color="#0F172A" />
        </Pressable>
      </View>

      <View style={styles.simpleCard}>
        <Text style={styles.simpleTitle}>One thing</Text>
        <Text style={styles.simpleMeta}>
          {todayUsage ? `${streak} day streak` : 'Start here'}
        </Text>
      </View>

      {menu}
    </View>
  );
}
    return (
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <View style={styles.logoBubble}>
              <Text style={styles.brainIcon}>🧠</Text>
            </View>

            <View>
              <Text style={styles.brandTitle}>Brain Dump</Text>
              <Text style={styles.brandSubtitle}>Organize your day</Text>
            </View>
          </View>

          <View style={styles.rightSide}>
            <Pressable
  onPress={() => setMenuOpen((value) => !value)}
  hitSlop={10}
  style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}
>
  <Ionicons name="menu" size={22} color="#0F172A" />
</Pressable>

            <View style={[styles.badge, todayUsage ? styles.badgeActive : styles.badgeMuted]}>
              <Text
                style={[
                  styles.badgeText,
                  todayUsage ? styles.badgeTextActive : styles.badgeTextMuted,
                ]}
              >
                {todayUsage ? `${streak} day${streak === 1 ? '' : 's'} 🔥` : 'New day'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.title}>Dump → Organize → Done</Text>
          <Text style={styles.subtitle}>Write anything. We’ll handle the rest.</Text>
        </View>
        {menu}
      </View>
    );
  }
);

Header.displayName = 'Header';

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
    position: 'relative',
    zIndex: 999,
  },

  simpleBrandRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
  gap: 10,
},

simpleBrandTitle: {
  fontSize: 26,
  fontWeight: '800',
  color: '#0F172A',
  flexShrink: 1,
},

  simpleCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
    zIndex: 1,
  },

  simpleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  simpleMeta: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  rightSide: {
    alignItems: 'flex-end',
    gap: 6,
  },

  logoBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },

  brainIcon: {
    fontSize: 46,
    transform: [{ translateY: -6 }],
  },
menu: {
  position: 'absolute',
  top: 48,
  right: 0,
  minWidth: 170,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  paddingVertical: 8,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 999,
  zIndex: 9999,
},
menuItem: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  fontSize: 14,
  fontWeight: '700',
  color: '#0F172A',
},
menuDivider: {
  height: 1,
  backgroundColor: '#E2E8F0',
  marginVertical: 6,
},

dangerMenuItem: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  fontSize: 14,
  fontWeight: '800',
  color: '#B45309',
},

  brandTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0F172A',
  },

  brandSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  menuButton: {
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFF7ED',
  borderWidth: 1,
  borderColor: '#FED7AA',
},
  buttonPressed: {
    opacity: 0.8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },

  badgeActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },

  badgeMuted: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  badgeTextActive: {
    color: '#047857',
  },

  badgeTextMuted: {
    color: '#92400E',
  },

  heroCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    color: '#64748B',
    marginTop: 7,
    fontSize: 14,
  },
});