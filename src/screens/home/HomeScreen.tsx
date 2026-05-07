// -----------------------------------------------------------------------------
// Home del paciente.
//
//   - Al entrar (y al volver al foco), revisa si el paciente tiene un caso
//     ACTIVO pendiente y, en ese caso, ofrece retomarlo.
//   - Botón principal: "Solicitar consulta".
//   - Botón secundario: cerrar sesión.
// -----------------------------------------------------------------------------
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { listMyCases, type CaseSummary, type PopulatedDoctor } from '@/api/cases';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [activeCase, setActiveCase] = useState<CaseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cases = await listMyCases();
      const active = cases.find((c) => c.status === 'active') ?? null;
      setActiveCase(active);
    } catch {
      // Silencioso: el interceptor ya maneja 401.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'No pudimos cerrar tu sesión. Intenta de nuevo.');
    } finally {
      setLoggingOut(false);
    }
  }

  function handleResume() {
    if (!activeCase) return;
    navigation.navigate('Chat', {
      caseId: activeCase._id,
      doctorName: formatDoctor(activeCase.doctor),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <View>
          <Text style={styles.greeting}>
            Hola{user?.firstName ? `, ${user.firstName}` : ''} 👋
          </Text>
          <Text style={styles.email}>{user?.email}</Text>

          {activeCase && (
            <View style={styles.activeCard}>
              <Text style={styles.activeLabel}>Consulta en curso</Text>
              <Text style={styles.activeDoctor}>
                {activeCase.type === 'video' ? '📹' : '💬'}{' '}
                {formatDoctor(activeCase.doctor) || 'Tu médico'}
              </Text>
              {activeCase.reason && (
                <Text style={styles.activeReason} numberOfLines={2}>
                  {activeCase.reason}
                </Text>
              )}
              <PrimaryButton
                title="Retomar consulta"
                onPress={handleResume}
                style={{ marginTop: 12 }}
              />
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>¿Necesitas atención?</Text>
            <Text style={styles.cardBody}>
              Describe brevemente tu motivo y te conectamos con un médico
              disponible. Si no hay ninguno libre, te ponemos en la cola.
            </Text>
            <PrimaryButton
              title="Solicitar consulta"
              onPress={() => navigation.navigate('RequestConsultation')}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>

        <PrimaryButton
          title="Cerrar sesión"
          variant="ghost"
          onPress={handleLogout}
          loading={loggingOut}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDoctor(
  doctor?: string | PopulatedDoctor,
): string {
  if (!doctor || typeof doctor === 'string') return '';
  const name = [doctor.firstName, doctor.lastName].filter(Boolean).join(' ');
  return name.trim() || doctor.email;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, flexGrow: 1, justifyContent: 'space-between' },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  email: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  card: {
    marginTop: 24,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontWeight: '600', color: colors.textPrimary, marginBottom: 6, fontSize: 16 },
  cardBody: { color: colors.textSecondary, lineHeight: 20 },
  activeCard: {
    marginTop: 24,
    backgroundColor: '#E7F3FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BCDCFF',
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activeDoctor: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 4,
  },
  activeReason: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
});
