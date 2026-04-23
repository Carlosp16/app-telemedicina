// -----------------------------------------------------------------------------
// Endpoints de autenticación/usuarios.
// Nombres y payloads alineados con el backend NestJS (módulo auth + users).
// -----------------------------------------------------------------------------
import { http } from './client';

export type UserRole = 'paciente' | 'medico' | 'admin';

export type AuthUser = {
  _id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function registerPatient(dto: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  accessCode: string;
}): Promise<AuthUser> {
  const { data } = await http.post<AuthUser>('/users/register', dto);
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await http.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await http.post('/auth/reset-password', { token, newPassword });
}

export async function me(): Promise<AuthUser> {
  const { data } = await http.get<AuthUser>('/auth/me');
  return data;
}

export async function logoutBackend(): Promise<void> {
  // En el backend el endpoint es best-effort; si falla no bloquea el logout local.
  try {
    await http.post('/auth/logout');
  } catch {
    /* ignore */
  }
}
