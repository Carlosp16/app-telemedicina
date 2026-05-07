// -----------------------------------------------------------------------------
// Sala de espera del paciente.
//
// Mientras no exista un evento servidor→cliente "te tomaron", polleamos cada
// 5 segundos dos cosas:
//   - Posición en la cola (GET /waiting-room/position).
//   - Casos activos del usuario (GET /cases/mine) por si el médico ya creó
//     el caso y no estamos en la cola.
//
// Si detectamos un caso activo nuevo, navegamos automáticamente al chat.
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listMyCases } from '@/api/cases';
import { errorMessage } from '@/api/client';
import { getWaitingPosition, leaveWaitingRoom } from '@/api/waiting-room';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/theme/colors';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'WaitingRoom'>;

const POLL_MS = 5_000;

export function WaitingRoomScreen({ navigation }: Props) {
  const [position, setPosition] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(async () => {
    // 1) ¿Ya hay un caso activo para mí? Si sí, saltar al chat.
    try {
      const cases = await listMyCases();
      const active = cases.find((c) => c.status === 'active');
      if (active) {
        stopPolling();
        navigation.replace('Chat', { caseId: active._id });
        return;
      }
    } catch {
      /* no bloqueamos el polling por errores transitorios */
    }

    // 2) Actualizar posición.
    try {
      const pos = await getWaitingPosition();
      setPosition(pos);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // Nos sacaron de la cola pero no hay caso aún — puede haber sido
        // tomado en un microinstante. Reintentamos un tick más.
      }
    }
  }, [navigation]);

  function stopPolling() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    tick();
    timerRef.current = setInterval(tick, POLL_MS);
    return stopPolling;
  }, [tick]);

  async function handleLeave() {
    setLeaving(true);
    try {
      await leaveWaitingRoom();
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Error', errorMessage(err));
      setLeaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.title}>Esperando a un médico...</Text>
          {position !== null && (
            <>
              <Text style={styles.positionLabel}>Tu posición en la cola</Text>
              <Text style={styles.position}>#{position}</Text>
            </>
          )}
          <Text style={styles.hint}>
            Mantén la pantalla abierta. Te atenderemos apenas un médico se libere.
          </Text>
        </View>

        <PrimaryButton
          title="Salir de la sala de espera"
          variant="ghost"
          onPress={handleLeave}
          loading={leaving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, color: colors.textPrimary, marginTop: 16, fontWeight: '600' },
  positionLabel: {
    color: colors.textSecondary,
    marginTop: 28,
    fontSize: 14,
  },
  position: {
    color: colors.primary,
    fontSize: 64,
    fontWeight: '800',
    marginTop: 4,
  },
  hint: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
});
