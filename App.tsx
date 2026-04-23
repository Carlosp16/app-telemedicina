// -----------------------------------------------------------------------------
// Componente raíz.
//
//   - Inicializa la sesión desde SecureStore al arrancar.
//   - Muestra un splash mientras decide si ya hay token válido.
//   - Delega la navegación a <RootNavigator/> que decide Auth vs App.
// -----------------------------------------------------------------------------
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import { RootNavigator } from '@/navigation/RootNavigator';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
