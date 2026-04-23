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
        set({ token, user: JSON.parse(userRaw) });
        // Validación asíncrona: si falla (token expirado) el interceptor 401
        // ya dispara logout.
        get().refreshMe().catch(() => undefined);
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
