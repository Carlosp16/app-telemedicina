// -----------------------------------------------------------------------------
// Configuración de entorno.
//
// Los valores vienen del campo `expo.extra` de `app.json` (o `app.config.ts` si
// decides usar variables de entorno dinámicas con dotenv). Esto permite cambiar
// la URL del backend sin tocar código: basta con editar app.json y recompilar.
//
// IMPORTANTE para probar en dispositivo físico:
//   - En el simulador de iOS: http://localhost:3000 funciona.
//   - En emulador Android: usa http://10.0.2.2:3000 (el alias del host).
//   - En teléfono físico conectado a tu Wi-Fi: usa la IP LAN de tu Mac,
//     por ejemplo http://192.168.1.23:3000
// -----------------------------------------------------------------------------
import Constants from 'expo-constants';

type Extra = {
  apiUrl?: string;
  socketUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  apiUrl: extra.apiUrl ?? 'http://localhost:3000/api',
  socketUrl: extra.socketUrl ?? 'http://localhost:3000',
} as const;
