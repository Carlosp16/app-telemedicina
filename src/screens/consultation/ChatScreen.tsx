// -----------------------------------------------------------------------------
// Pantalla de chat 1-a-1 entre paciente y médico.
//
//   - Al entrar, carga el historial con GET /chat/cases/:id/messages.
//   - Luego se conecta al namespace /chat vía Socket.io:
//       * join-case   → se une al room del caso.
//       * message     → recibe mensajes en vivo (propios y del otro).
//       * case-closed → el médico cerró el caso.
//   - Para enviar mensaje: emite `send-message`.
//   - Si el caso se cierra, muestra banner y bloquea el input.
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ChatMessage } from '@/api/chat';
import { listMessages, markAsRead } from '@/api/chat';
import { errorMessage } from '@/api/client';
import { acceptCall, rejectCall, startCallForCase } from '@/api/video';
import { IncomingCallModal } from '@/components/IncomingCallModal';
import { VideoCallOverlay } from '@/components/VideoCallOverlay';
import { useChatSocket, type IncomingCallPayload } from '@/hooks/useChatSocket';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

const MAX_MESSAGE = 300;

export function ChatScreen({ route, navigation }: Props) {
  const { caseId, doctorName } = route.params;
  const currentUserId = useAuthStore((s) => s.user?._id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [closed, setClosed] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ------ Videollamada ------------------------------------------------------
  const [activeCall, setActiveCall] = useState<
    | { sessionId: string; role: 'caller' | 'callee'; peerName?: string }
    | null
  >(null);
  const [incoming, setIncoming] = useState<IncomingCallPayload | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Handlers del socket.
  const handleIncoming = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      // Evitamos duplicados si el servidor nos reenvía un mensaje que ya teníamos.
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const handleCaseClosed = useCallback(() => {
    setClosed(true);
  }, []);

  const handleRemoteTyping = useCallback(
    (payload: { userId: string; typing: boolean }) => {
      if (payload.userId === currentUserId) return;
      setRemoteTyping(payload.typing);
    },
    [currentUserId],
  );

  const handleIncomingCall = useCallback(
    (payload: IncomingCallPayload) => {
      // Si nosotros mismos somos quienes llamamos, ignoramos.
      if (payload.callerId === currentUserId) return;
      if (activeCall) return;
      setIncoming(payload);
    },
    [activeCall, currentUserId],
  );

  const { connected, sendMessage, sendTyping } = useChatSocket({
    caseId,
    onMessage: handleIncoming,
    onCaseClosed: handleCaseClosed,
    onRemoteTyping: handleRemoteTyping,
    onIncomingCall: handleIncomingCall,
  });

  // Cargar histórico al montar.
  useEffect(() => {
    (async () => {
      try {
        const history = await listMessages(caseId);
        setMessages(history);
        await markAsRead(caseId).catch(() => undefined);
      } catch (err) {
        Alert.alert('Error al cargar el chat', errorMessage(err));
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId, navigation]);

  async function handleStartCall() {
    if (startingCall || activeCall || closed) return;
    setStartingCall(true);
    try {
      const { session } = await startCallForCase(caseId);
      setActiveCall({
        sessionId: session._id,
        role: 'caller',
        peerName: doctorName,
      });
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'No pudimos iniciar la llamada.'));
    } finally {
      setStartingCall(false);
    }
  }

  async function handleAcceptIncoming() {
    if (!incoming) return;
    setAccepting(true);
    try {
      await acceptCall(incoming.sessionId);
      setActiveCall({
        sessionId: incoming.sessionId,
        role: 'callee',
        peerName: incoming.callerName,
      });
      setIncoming(null);
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'No pudimos aceptar la llamada.'));
    } finally {
      setAccepting(false);
    }
  }

  async function handleRejectIncoming() {
    if (!incoming) return;
    try {
      await rejectCall(incoming.sessionId);
    } catch {
      /* ignore */
    } finally {
      setIncoming(null);
    }
  }

  // Actualizar título dinámicamente y poner botón 📹 en el header.
  useEffect(() => {
    navigation.setOptions({
      title: doctorName ? `Dr. ${doctorName}` : 'Chat',
      headerRight: () =>
        closed || activeCall ? null : (
          <Pressable
            onPress={handleStartCall}
            disabled={startingCall}
            style={({ pressed }) => [
              { padding: 8, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={{ fontSize: 22 }}>📹</Text>
          </Pressable>
        ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorName, navigation, closed, activeCall, startingCall]);

  // Auto-scroll al final cuando cambian los mensajes.
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  function handleSend() {
    const content = draft.trim();
    if (!content || closed) return;
    sendMessage(content);
    setDraft('');
    sendTyping(false);
  }

  function handleDraftChange(text: string) {
    setDraft(text.slice(0, MAX_MESSAGE));
    // Señal de typing: emitimos "true" al teclear y "false" después de 1.5s sin cambios.
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 1500);
  }

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      // Comparación tolerante: el sender puede llegar como string raw o como
      // objeto populated (`{ _id, ... }`). idOf normaliza ambos casos.
      const senderId = idOf(item.sender);
      const mine = !!currentUserId && senderId === currentUserId;
      return (
        <View
          style={[
            styles.bubbleRow,
            mine ? styles.rowMine : styles.rowOther,
          ]}
        >
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
            <Text style={[styles.senderLabel, mine ? styles.senderLabelMine : styles.senderLabelOther]}>
              {mine ? 'Tú' : doctorName ? `Dr. ${doctorName}` : 'Médico'}
            </Text>
            {item.kind === 'file' && item.fileData ? (
              <Text style={[styles.content, mine && styles.contentMine]}>
                📎 {item.fileData.name}
              </Text>
            ) : (
              <Text style={[styles.content, mine && styles.contentMine]}>
                {item.content}
              </Text>
            )}
            <Text style={[styles.timestamp, mine && styles.timestampMine]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    [currentUserId, doctorName],
  );

  const keyExtractor = useCallback((m: ChatMessage) => m._id, []);

  const footer = useMemo(() => {
    if (closed) {
      return (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            El médico cerró este caso. No se pueden enviar más mensajes.
          </Text>
        </View>
      );
    }
    if (remoteTyping) {
      return (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>escribiendo…</Text>
        </View>
      );
    }
    return null;
  }, [closed, remoteTyping]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {!connected && !closed && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>Reconectando…</Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          ListFooterComponent={footer}
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={handleDraftChange}
            placeholder={closed ? 'Caso cerrado' : 'Escribe un mensaje...'}
            placeholderTextColor={colors.textSecondary}
            editable={!closed}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!draft.trim() || closed) && styles.sendDisabled,
              pressed && styles.sendPressed,
            ]}
            onPress={handleSend}
            disabled={!draft.trim() || closed}
          >
            <Text style={styles.sendText}>Enviar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {activeCall && (
        <VideoCallOverlay
          visible
          sessionId={activeCall.sessionId}
          role={activeCall.role}
          peerName={activeCall.peerName}
          onEnded={() => setActiveCall(null)}
        />
      )}

      <IncomingCallModal
        visible={!!incoming}
        callerName={incoming?.callerName ?? 'Médico'}
        accepting={accepting}
        onAccept={handleAcceptIncoming}
        onReject={handleRejectIncoming}
      />
    </SafeAreaView>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Extrae el _id como string desde una referencia que puede llegar como
 * string raw, ObjectId, u objeto populated `{ _id, ... }`. Necesario porque
 * el backend a veces popula y a veces no.
 */
function idOf(ref: unknown): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  const maybe = ref as { _id?: unknown; toString?: () => string };
  if (maybe._id != null) return String(maybe._id);
  return maybe.toString ? maybe.toString() : String(ref);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  statusBar: {
    backgroundColor: colors.danger,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 16 },
  bubbleRow: { marginVertical: 6, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#ECEEF1',
    borderBottomLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  senderLabelMine: {
    color: 'rgba(255,255,255,0.85)',
  },
  senderLabelOther: {
    color: colors.primary,
  },
  content: { color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
  contentMine: { color: '#fff' },
  timestamp: {
    fontSize: 10,
    color: colors.textSecondary,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timestampMine: { color: 'rgba(255,255,255,0.75)' },
  banner: {
    margin: 12,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  bannerText: { color: '#856404', textAlign: 'center', fontSize: 13 },
  typingRow: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { color: colors.textSecondary, fontStyle: 'italic', fontSize: 12 },
  composer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.background,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendBtn: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendPressed: { opacity: 0.8 },
  sendText: { color: '#fff', fontWeight: '600' },
});
