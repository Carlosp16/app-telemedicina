// -----------------------------------------------------------------------------
// Factory de sockets autenticados.
//
// El backend espera el JWT en `handshake.auth.token` (ver WsJwtGuard). Usamos
// `autoConnect: false` para dejarle al caller decidir cuándo conectar — así
// el hook de la pantalla puede encender/apagar el socket en el ciclo de vida
// del componente sin efectos colaterales.
// -----------------------------------------------------------------------------
import { io, Socket } from 'socket.io-client';

import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';

export type Namespace = '/chat' | '/video';

export function createSocket(namespace: Namespace): Socket {
  const token = useAuthStore.getState().token;
  return io(`${env.socketUrl}${namespace}`, {
    // Probamos websocket primero y si falla caemos a long-polling. Hace falta
    // cuando el backend está detrás de un proxy (ngrok, Cloudflare Tunnel, etc.)
    // que no siempre permite el upgrade a websocket en frío.
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1_000,
    timeout: 20_000,
    auth: { token },
    extraHeaders: {
      // Salta la página de warning HTML que ngrok inyecta en cuentas free.
      'ngrok-skip-browser-warning': '1',
    },
  });
}
