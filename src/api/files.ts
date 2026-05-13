// -----------------------------------------------------------------------------
// Cliente HTTP para archivos en la app móvil.
//
// El backend trabaja en Base64. En móvil usamos expo-document-picker para
// elegir el archivo + expo-file-system para leerlo como base64.
// La descarga: traemos el base64 del backend, lo guardamos en caché de la app
// y abrimos con `expo-sharing` (que delega al picker nativo del SO).
// -----------------------------------------------------------------------------
import { http } from './client';
import type { ChatMessage } from './chat';

export const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_FILE_SIZE = 1_048_576; // 1 MB

export type AllowedMime = (typeof ALLOWED_MIME)[number];

export interface DownloadedFile {
  fileName: string;
  mimeType: AllowedMime;
  size: number;
  data: string; // Base64
}

export interface UploadInput {
  fileName: string;
  mimeType: AllowedMime;
  size: number;
  /** Contenido en Base64 (sin prefijo data:). */
  data: string;
}

export async function uploadFile(
  caseId: string,
  input: UploadInput,
): Promise<ChatMessage> {
  if (!ALLOWED_MIME.includes(input.mimeType)) {
    throw new Error('Tipo de archivo no permitido. Solo PDF, JPG o PNG.');
  }
  if (input.size > MAX_FILE_SIZE) {
    throw new Error('El archivo supera 1 MB.');
  }
  const { data: msg } = await http.post<ChatMessage>(
    `/files/cases/${caseId}/upload`,
    input,
  );
  return msg;
}

export async function downloadFile(messageId: string): Promise<DownloadedFile> {
  const { data } = await http.get<DownloadedFile>(`/files/messages/${messageId}`);
  return data;
}
