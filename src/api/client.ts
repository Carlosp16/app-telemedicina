// -----------------------------------------------------------------------------
// Cliente HTTP global (axios).
//
//  - Inyecta automáticamente el token JWT en cada request si hay sesión activa.
//  - En caso de 401 sobre una request autenticada, limpia la sesión local
//    sin llamar al backend (eso evita el bucle logout → 401 → logout).
//
// Nota: este módulo NO importa `auth.store` en top-level para evitar el ciclo
// de requires (`auth.store -> api/auth -> api/client -> auth.store`). El store
// se inyecta en runtime mediante `bindAuthBridge` desde el propio store.
// -----------------------------------------------------------------------------
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';

/**
 * Puente con el store de autenticación. Lo provee el store cuando se inicializa
 * la app (ver `auth.store.ts`). Mientras no esté seteado, los interceptores
 * son no-ops.
 */
type AuthBridge = {
  getToken: () => string | null;
  /** Limpia el estado local sin llamar al backend. */
  clearSession: () => void;
};

let bridge: AuthBridge | null = null;
export function bindAuthBridge(b: AuthBridge): void {
  bridge = b;
}

export const http: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: {
    // Si el backend está detrás de ngrok free, este header evita la página de
    // warning HTML que ngrok inyecta antes de pasar al endpoint real.
    'ngrok-skip-browser-warning': '1',
  },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = bridge?.getToken() ?? null;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    // Sólo reaccionamos a 401s sobre requests autenticadas. Login y logout
    // tienen su propia semántica y NO deben disparar logout en cascada.
    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/logout');
    if (status === 401 && !isAuthEndpoint) {
      bridge?.clearSession();
    }
    return Promise.reject(error);
  },
);

/**
 * Normaliza el error de axios para mostrarle al usuario un mensaje legible.
 * El backend responde siempre con `{ message: string | string[], statusCode, path }`.
 */
export function errorMessage(err: unknown, fallback = 'Error inesperado.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data!.message.join('\n');
    if (typeof data?.message === 'string') return data!.message;
    if (err.message) return err.message;
  }
  return fallback;
}
