// -----------------------------------------------------------------------------
// Store de autenticación (zustand + expo-secure-store).
//
// El token JWT se persiste en el Keychain del sistema (iOS) o en el Keystore
// cifrado (Android). NO se guarda en AsyncStorage para evitar exponerlo si el
// dispositivo no está cifrado.
//
// El store le pasa al `client` HTTP un puente (`bindAuthBridge`) con los dos
// hooks que el cliente necesita (lectura del token + limpieza local de la
// sesión cuando llega un 401 a una request autenticada). De esta forma el
// cliente queda desacoplado del store y se rompe el require cycle
// `auth.store ↔ api/auth ↔ api/client`.
// -----------------------------------------------------------------------------
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { AuthUser } from '@/api/auth';
import * as authApi from '@/api/auth';
import { bindAuthBridge } from '@/api/client';

const TOKEN_KEY = 'telemed.auth.token';
const USER_KEY = 'telemed.auth.user';

type AuthState = {
  hydrated: boolean;
  token: string | null;
  user: AuthUser | null;

  hydrate: () => Promise<void>;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  /** Limpia el estado en memoria + persistencia. NO llama al backend. */
  clearSession: () => Promise<void>;
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
          await get().clearSession();
        } else {
          set({ token, user });
          // Validación asíncrona: si falla (token expirado) el interceptor 401
          // ya dispara la limpieza local.
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

  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ token: null, user: null });
  },

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    if (res.user.role !== 'paciente') {
      // Esta app es exclusiva para pacientes: los médicos y administradores
      // entran por el portal web. NO persistimos el token (no llamamos
      // setSession) y NO disparamos logoutBackend porque generaría 401 en
      // cascada — el token recién emitido nunca quedó guardado.
      throw new Error(
        'Esta app es solo para pacientes. Si eres médico o administrador, ' +
          'entra por el portal web.',
      );
    }
    await get().setSession(res.accessToken, res.user);
  },

  logout: async () => {
    // Best-effort en el backend; si falla no bloquea el logout local.
    await authApi.logoutBackend();
    await get().clearSession();
  },

  refreshMe: async () => {
    const fresh = await authApi.me();
    // Defensa: si /auth/me no trae _id (caso de respuestas viejas), nos
    // quedamos con el _id del login original para no romper la
    // identificación de mensajes en el chat.
    const current = get().user;
    const merged: AuthUser = {
      ...fresh,
      _id: fresh._id || current?._id || '',
    };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(merged));
    set({ user: merged });
  },
}));

// Le pasamos al cliente HTTP los dos hooks que necesita para inyectar el token
// y limpiar la sesión cuando llega un 401, sin tener que importarse mutuamente.
bindAuthBridge({
  getToken: () => useAuthStore.getState().token,
  clearSession: () => {
    void useAuthStore.getState().clearSession();
  },
});
