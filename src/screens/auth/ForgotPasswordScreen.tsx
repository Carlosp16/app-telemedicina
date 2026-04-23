// -----------------------------------------------------------------------------
// Recuperación de contraseña: el usuario ingresa su correo y el backend
// envía un enlace de reset a través de SMTP (en dev captura Mailhog).
// -----------------------------------------------------------------------------
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { forgotPassword } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/theme/colors';

export function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      Alert.alert(
        'Revisa tu correo',
        'Si la dirección está registrada, te enviamos las instrucciones para restablecer tu contraseña.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('No pudimos procesar tu solicitud', errorMessage(err));
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
          <Text style={styles.intro}>
            Te enviaremos un enlace para que puedas crear una contraseña nueva.
          </Text>
          <FormInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <PrimaryButton
            title="Enviar enlace de recuperación"
            onPress={handleSubmit}
            loading={loading}
            disabled={!email.trim()}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  intro: { color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
});
