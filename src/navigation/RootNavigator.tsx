// -----------------------------------------------------------------------------
// Decide cuál árbol de pantallas mostrar según el estado de sesión.
//
//   - Sin token  -> AuthStack   (Login / Register / Forgot)
//   - Con token  -> AppStack    (Home y de ahí derivan el resto de flujos)
// -----------------------------------------------------------------------------
import { useAuthStore } from '@/stores/auth.store';
import { AppStack } from './AppStack';
import { AuthStack } from './AuthStack';

export function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  return token ? <AppStack /> : <AuthStack />;
}
