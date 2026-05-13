// -----------------------------------------------------------------------------
// Overlay de videollamada para la app móvil.
//
// Dos modos:
//   - 'video'  → remoto a pantalla completa con PIP del propio.
//   - 'chat'   → videos minimizados arriba (franja chica) para dejar el
//                ChatScreen interactuable abajo.
//
// El componente vive como `Modal` por encima del ChatScreen. La lógica de
// la conexión la lleva `useVideoCall`.
// -----------------------------------------------------------------------------
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';

import { useVideoCall, type CallControls } from '@/hooks/useVideoCall';
import { colors } from '@/theme/colors';

interface Props {
  visible: boolean;
  sessionId: string;
  role: 'caller' | 'callee';
  peerName?: string;
  onEnded: () => void;
}

export function VideoCallOverlay({ visible, sessionId, role, peerName, onEnded }: Props) {
  const [mode, setMode] = useState<'video' | 'chat'>('video');
  const call = useVideoCall({ sessionId, role, onEnded });

  // En modo "chat", el overlay no ocupa toda la pantalla — solo una franja.
  // Lo logramos saliendo del Modal y renderizando un container absoluto.
  if (mode === 'chat') {
    return (
      <View pointerEvents="box-none" style={styles.chatModeContainer}>
        <View style={styles.chatModeBar}>
          <View style={styles.miniVideoBox}>
            {call.remoteStream && (
              <RTCView
                streamURL={call.remoteStream.toURL()}
                style={styles.miniVideo}
                objectFit="cover"
              />
            )}
          </View>
          <View style={styles.miniVideoBox}>
            {call.localStream && (
              <RTCView
                streamURL={call.localStream.toURL()}
                style={styles.miniVideo}
                objectFit="cover"
              />
            )}
          </View>
          <Controls call={call} compact onToggleMode={() => setMode('video')} mode="chat" />
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.fullScreen}>
        {call.remoteStream ? (
          <RTCView
            streamURL={call.remoteStream.toURL()}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <Text style={styles.placeholderText}>{labelForState(call.state, peerName)}</Text>
          </View>
        )}

        {call.localStream && (
          <View style={styles.pip}>
            <RTCView
              streamURL={call.localStream.toURL()}
              style={styles.pipVideo}
              objectFit="cover"
              mirror
            />
          </View>
        )}

        <View style={styles.peerLabel}>
          <Text style={styles.peerLabelText}>{peerName ?? 'En llamada'}</Text>
        </View>

        <Controls
          call={call}
          mode="video"
          onToggleMode={() => setMode('chat')}
        />
      </View>
    </Modal>
  );
}

function Controls({
  call,
  mode,
  onToggleMode,
  compact = false,
}: {
  call: CallControls;
  mode: 'video' | 'chat';
  onToggleMode: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.controlsBar, compact ? styles.controlsBarCompact : null]}>
      <CtlBtn
        icon={call.micOn ? 'mic' : 'mic-off'}
        active={call.micOn}
        onPress={call.toggleMic}
      />
      <CtlBtn
        icon={call.cameraOn ? 'videocam' : 'videocam-off'}
        active={call.cameraOn}
        onPress={call.toggleCamera}
      />
      <CtlBtn icon="camera-reverse" active onPress={call.switchCamera} />
      <CtlBtn
        icon={mode === 'video' ? 'chatbubble-ellipses' : 'videocam'}
        active
        onPress={onToggleMode}
      />
      <Pressable onPress={call.hangup} style={styles.hangupBtn}>
        <Ionicons name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        <Text style={styles.hangupText}>Colgar</Text>
      </Pressable>
    </View>
  );
}

function CtlBtn({
  icon,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.ctlBtn, !active && styles.ctlBtnOff]}
    >
      <Ionicons name={icon} size={22} color="#fff" />
    </Pressable>
  );
}

function labelForState(state: string, peerName?: string): string {
  switch (state) {
    case 'connecting':
      return 'Conectando…';
    case 'ringing':
      return peerName ? `Llamando a ${peerName}…` : 'Esperando al otro participante…';
    case 'ended':
      return 'Llamada finalizada';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#000' },
  placeholder: {
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: '#fff', fontSize: 16 },
  pip: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 110,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: '#000',
  },
  pipVideo: { flex: 1 },
  peerLabel: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  peerLabelText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  controlsBar: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  controlsBarCompact: {
    position: 'relative',
    bottom: 0,
    paddingHorizontal: 6,
    flex: 1,
    justifyContent: 'flex-end',
    gap: 6,
  },
  ctlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctlBtnOff: { backgroundColor: 'rgba(220,38,38,0.85)' },
  ctlBtnText: { fontSize: 22, color: '#fff' },
  hangupBtn: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hangupText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chatModeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  chatModeBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    paddingTop: 50,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  miniVideoBox: {
    width: 70,
    height: 90,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  miniVideo: { flex: 1 },
});

// referencia para que el linter no se queje del import sin usar en algunos casos
void colors;
