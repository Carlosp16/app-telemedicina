// -----------------------------------------------------------------------------
// "Solicitar consulta" — el paciente describe el motivo y presiona "Iniciar
// consulta". El flujo es:
//
//   1. Intenta iniciar chat directamente (`POST /api/chat/start`).
//   2. Si hay médico disponible: navega a ChatScreen.
//   3. Si no hay (404): ofrece unirse a la sala de espera.
// -----------------------------------------------------------------------------
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { startChat } from '@/api/chat';
import { errorMessage } from '@/api/client';
import { joinWaitingRoom } from '@/api/waiting-room';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/theme/colors';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'RequestConsultation'>;

const MAX_REASON = 300;

export function RequestConsultationScreen({ navigation }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    const trimmed = reason.trim();
    setLoading(true);
    try {
      const { case: kase, doctor } = await startChat(trimmed || undefined);
      navigation.replace('Chat', { caseId: kase._id, doctorName: formatDoctor(doctor) });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // No hay médico libre: preguntamos si quiere ponerse en lista de espera.
        promptJoinWaitingRoom(trimmed);
      } else {
        Alert.alert('No pudimos iniciar la consulta', errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  function promptJoinWaitingRoom(reasonText: string) {
    Alert.alert(
      'No hay médicos disponibles',
      '¿Quieres ponerte en la lista de espera? Te atenderán en cuanto un médico se libere.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Esperar',
          onPress: async () => {
            try {
              await joinWaitingRoom(reasonText || undefined);
              navigation.replace('WaitingRoom');
            } catch (err) {
              Alert.alert('Error', errorMessage(err));
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>¿Qué necesitas consultar?</Text>
          <Text style={styles.hint}>
            Describe brevemente tu motivo. El médico lo verá antes de atenderte.
          </Text>

          <TextInput
            style={styles.textarea}
            value={reason}
            onChangeText={(v) => setReason(v.slice(0, MAX_REASON))}
            placeholder="Ejemplo: dolor de cabeza desde ayer..."
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.counter}>
            {reason.length} / {MAX_REASON}
          </Text>

          <PrimaryButton
            title="Iniciar consulta"
            onPress={handleStart}
            loading={loading}
            style={{ marginTop: 16 }}
          />
          <Text style={styles.footer}>
            Si ningún médico está disponible, te ofreceremos una sala de espera
            con tu posición en la cola.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatDoctor(d: { firstName?: string; lastName?: string; email: string }): string {
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ');
  return name.trim() || d.email;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  hint: { color: colors.textSecondary, marginTop: 4, marginBottom: 20, lineHeight: 20 },
  textarea: {
    minHeight: 140,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
