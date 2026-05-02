import { memo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface InputCardProps {
  value: string;
  onChangeText: (text: string) => void;
  disabled?: boolean;
}

export const InputCard = memo(
  ({ value, onChangeText, disabled = false }: InputCardProps) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={[styles.card, focused && styles.cardFocused]}>
        <TextInput
          accessibilityLabel="Thoughts"
          style={styles.input}
          placeholder={'What’s on your mind?\n\n(e.g. call boss, gym, groceries)'}
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          editable={!disabled}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={1000}
          returnKeyType="done"
          blurOnSubmit
        />

        {!value ? (
          <Text style={styles.subHint}>
            Just write or speak. We’ll organize it.
          </Text>
        ) : null}
      </View>
    );
  }
);

InputCard.displayName = 'InputCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF7ED',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 24,
  },

  cardFocused: {
  borderColor: '#F97316',
  shadowColor: '#F97316',
  shadowOpacity: 0.1,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
},

  input: {
    minHeight: 100,
    fontSize: 16,
    lineHeight: 26,
    color: '#0F172A',
    padding: 0,
  },

  subHint: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});