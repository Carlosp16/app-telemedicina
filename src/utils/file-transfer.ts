// -----------------------------------------------------------------------------
// Utilidades de transferencia de archivos en RN/Expo.
//
//   - pickFileForUpload(): abre el document picker, valida tipo y peso, y
//     devuelve los campos listos para POST /files/cases/:id/upload.
//   - saveAndOpenDownloadedFile(): toma el base64 que vino del backend, lo
//     escribe en el cache de la app y dispara el sheet "Compartir" nativo
//     para que el usuario lo guarde donde quiera (Drive, Galería, etc.).
// -----------------------------------------------------------------------------
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  ALLOWED_MIME,
  MAX_FILE_SIZE,
  type AllowedMime,
  type DownloadedFile,
  type UploadInput,
} from '@/api/files';

export async function pickFileForUpload(): Promise<UploadInput | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  const mime = (asset.mimeType ?? '') as AllowedMime;
  if (!ALLOWED_MIME.includes(mime)) {
    throw new Error('Tipo de archivo no permitido. Solo PDF, JPG o PNG.');
  }
  const size = asset.size ?? 0;
  if (size === 0) {
    throw new Error('No pudimos leer el archivo.');
  }
  if (size > MAX_FILE_SIZE) {
    throw new Error('El archivo supera 1 MB.');
  }

  // Leemos el contenido como base64.
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    fileName: asset.name,
    mimeType: mime,
    size,
    data: base64,
  };
}

/**
 * Escribe el contenido del archivo descargado en el cache de la app y
 * dispara el sheet "Compartir" nativo. El usuario lo guarda donde quiera.
 */
export async function saveAndOpenDownloadedFile(file: DownloadedFile): Promise<void> {
  const uri = `${FileSystem.cacheDirectory}${Date.now()}-${file.fileName}`;
  await FileSystem.writeAsStringAsync(uri, file.data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: file.mimeType,
      dialogTitle: file.fileName,
    });
  } else {
    throw new Error('Tu dispositivo no soporta abrir/compartir archivos.');
  }
}
