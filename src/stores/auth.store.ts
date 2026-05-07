// -----------------------------------------------------------------------------
// Store de autenticación (zustand + expo-secure-store).
//
// El token JWT se persiste en el Keychain del sistema (iOS) o en el Keystore
// cifrado (Android). NO se guarda en AsyncStorage para evitar exponerlo si el
// dispositivo no está cifrado.
// -----------------------------------------------------------------------------
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { AuthUser } from '@/api/auth';
import * as authApi from '@/api/auth';

const TOKEN_KEY = 'telemed.auth.token';
const USER_KEY = 'telemed.auth.user';

type AuthState = {
  hydrated: boolean;
  token: string | null;
  user: AuthUser | null;

  hydrate: () => Promise<void>;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  token: null,
  user: null,

  /**
   * Se llama al arrancar la app. Lee el token persistido y, si existe, valida
   * que siga siendo útil refrescando los datos del usuario desde el backend.
   */
  hydrate: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (token && userRaw) {
        const user = JSON.parse(userRaw) as AuthUser;
        // Defensa: si en versiones anteriores se guardó un usuario que no es
        // paciente, lo limpiamos para evitar que entre a la UI del paciente.
        if (user.role !== 'paciente') {
          await Promise.all([
            SecureStore.deleteItemAsync(TOKEN_KEY),
            SecureStore.deleteItemAsync(USER_KEY),
          ]);
        } else {
          set({ token, user });
          // Validación asíncrona: si falla (token expirado) el interceptor 401
          // ya dispara logout.
          get().refreshMe().catch(() => undefined);
        }
      }
    } finally {
      set({ hydrated: true });
    }
  },

  setSession: async (token, user) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user });
  },

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    if (res.user.role !== 'paciente') {
      // Esta app es exclusiva para pacientes: los médicos y administradores
      // entran por el portal web. Cerramos la sesión en el backend (best-effort)
      // para no dejar el token huérfano y devolvemos un error claro.
      authApi.logoutBackend().catch(() => undefined);
      throw new Error(
        'Esta app es solo para pacientes. Si eres médico o administrador, ' +
          'entra por el portal web.',
      );
    }
    await get().setSession(res.accessToken, res.user);
  },

  logout: async () => {
    await authApi.logoutBackend();
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ token: null, user: null });
  },

  refreshMe: async () => {
    const user = await authApi.me();
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
