// -----------------------------------------------------------------------------
// Hook que encapsula la conexión al namespace /chat para un caso dado.
//
// Maneja:
//   - Conexión/desconexión y reconexión automática (Socket.io la hace sola).
//   - Suscripción al room del caso (`join-case`).
//   - Listener de mensajes entrantes.
//   - API imperativa para enviar mensajes (`send-message`).
//   - Aviso de "typing" al otro participante.
//   - Evento `case-closed` para que la pantalla pueda reaccionar.
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

import type { ChatMessage } from '@/api/chat';
import { createSocket } from '@/realtime/socket';

export type ChatSocketOptions = {
  caseId: string;
  onMessage: (msg: ChatMessage) => void;
  onCaseClosed?: () => void;
  onRemoteTyping?: (payload: { userId: string; typing: boolean }) => void;
};

export function useChatSocket({
  caseId,
  onMessage,
  onCaseClosed,
  onRemoteTyping,
}: ChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guardamos las callbacks más recientes en refs para no re-suscribirse
  // cada vez que el componente padre re-renderiza.
  const onMessageRef = useRef(onMessage);
  const onCaseClosedRef = useRef(onCaseClosed);
  const onRemoteTypingRef = useRef(onRemoteTyping);
  onMessageRef.current = onMessage;
  onCaseClosedRef.current = onCaseClosed;
  onRemoteTypingRef.current = onRemoteTyping;

  useEffect(() => {
    const socket = createSocket('/chat');
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      socket.emit('join-case', { caseId });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => setError(err.message));

    socket.on('message', (msg: ChatMessage) => onMessageRef.current(msg));
    socket.on('case-closed', () => onCaseClosedRef.current?.());
    socket.on('typing', (payload: { userId: string; typing: boolean }) =>
      onRemoteTypingRef.current?.(payload),
    );

    socket.connect();

    return () => {
      socket.emit('leave-case', { caseId });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [caseId]);

  const sendMessage = useCallback(
    (content: string) => {
      socketRef.current?.emit('send-message', { caseId, content });
    },
    [caseId],
  );

  const sendTyping = useCallback(
    (typing: boolean) => {
      socketRef.current?.emit('typing', { caseId, typing });
    },
    [caseId],
  );

  return { connected, error, sendMessage, sendTyping };
}
