// Input de formulario reutilizable. Mantiene la apariencia consistente en
// todas las pantallas de auth y reduce la boilerplate de cada formulario.
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '@/theme/colors';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function FormInput({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !!error && styles.inputError, style]}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
