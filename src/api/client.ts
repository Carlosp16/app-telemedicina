// -----------------------------------------------------------------------------
// Cliente HTTP global (axios).
//
//  - Inyecta automáticamente el token JWT en cada request si hay sesión activa.
//  - En caso de 401 dispara logout del store para volver a pantalla de login.
// -----------------------------------------------------------------------------
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';

export const http: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Token inválido o expirado: cierra sesión y devuelve al login.
      await useAuthStore.getState().logout();
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
