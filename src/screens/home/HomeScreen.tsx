// -----------------------------------------------------------------------------
// Home placeholder. Por ahora sólo muestra los datos del usuario y un botón
// para cerrar sesión. Desde aquí se enganchará en iteraciones siguientes:
//   - Botón "Solicitar consulta" (abre la sala de espera)
//   - Historial de consultas previas
//   - Pantalla de chat / video cuando un médico te toma
// -----------------------------------------------------------------------------
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <View>
          <Text style={styles.greeting}>
            Hola{user?.firstName ? `, ${user.firstName}` : ''} 👋
          </Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Próximamente</Text>
            <Text style={styles.cardBody}>
              Desde aquí vas a poder solicitar una consulta, chatear con tu médico
              y hacer videollamadas. Estamos terminando estas funcionalidades.
            </Text>
          </View>
        </View>

        <PrimaryButton
          title="Cerrar sesión"
          variant="ghost"
          onPress={handleLogout}
          loading={loggingOut}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'space-between' },
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
  cardTitle: { fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  cardBody: { color: colors.textSecondary, lineHeight: 20 },
});
