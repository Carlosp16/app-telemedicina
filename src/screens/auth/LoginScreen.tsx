// -----------------------------------------------------------------------------
// Pantalla de inicio de sesión.
// Conecta directamente con POST /api/auth/login del backend.
// -----------------------------------------------------------------------------
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { errorMessage } from '@/api/client';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const loginAction = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await loginAction(email.trim(), password);
      // No hace falta navegar: el RootNavigator cambia al AppStack automáticamente.
    } catch (err) {
      Alert.alert('No pudimos iniciar sesión', errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Telemedicina</Text>
            <Text style={styles.subtitle}>Consulta médica desde tu celular.</Text>
          </View>

          <FormInput
            label="Correo electrónico"
            placeholder="tu@correo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <FormInput
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />

          <PrimaryButton
            title="Ingresar"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            style={{ marginTop: 8 }}
          />

          <PrimaryButton
            title="¿Olvidaste tu contraseña?"
            variant="ghost"
            onPress={() => navigation.navigate('ForgotPassword')}
          />

          <View style={styles.divider} />

          <Text style={styles.helper}>¿Todavía no tienes cuenta?</Text>
          <PrimaryButton
            title="Crear cuenta con código de acceso"
            variant="ghost"
            onPress={() => navigation.navigate('Register')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  helper: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
