// -----------------------------------------------------------------------------
// Registro de paciente.
// Requiere un código de acceso válido (lo entrega un administrador).
// Conecta con POST /api/users/register del backend.
// -----------------------------------------------------------------------------
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { registerPatient } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const doLogin = useAuthStore((s) => s.login);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    accessCode.trim().length >= 4;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await registerPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        accessCode: accessCode.trim().toUpperCase(),
      });
      // Auto-login para evitar doble entrada de credenciales:
      await doLogin(email.trim(), password);
    } catch (err) {
      Alert.alert('No pudimos crear la cuenta', errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormInput label="Nombre" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <FormInput label="Apellido" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <FormInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <FormInput
            label="Contraseña (mín. 8 caracteres)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />
          <FormInput
            label="Código de acceso"
            placeholder="Ej: K7M2X9AB"
            value={accessCode}
            onChangeText={(v) => setAccessCode(v.toUpperCase())}
            autoCapitalize="characters"
          />

          <PrimaryButton
            title="Crear cuenta"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            style={{ marginTop: 8 }}
          />
          <PrimaryButton
            title="Ya tengo cuenta, ir a iniciar sesión"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
});
