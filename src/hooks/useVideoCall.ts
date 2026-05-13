// -----------------------------------------------------------------------------
// Hook de videollamada para React Native.
//
// API simétrica al hook del portal web (useVideoCall del portal-web), pero
// usando `react-native-webrtc` en lugar de la API nativa del browser.
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

import { createSocket } from '@/realtime/socket';
import { getIceServers } from '@/api/video';

export type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'ended';

interface Options {
  sessionId: string | null;
  role: 'caller' | 'callee';
  onError?: (msg: string) => void;
  onEnded?: () => void;
}

export interface CallControls {
  state: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micOn: boolean;
  cameraOn: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  hangup: () => void;
}

export function useVideoCall(opts: Options): CallControls {
  const { sessionId, role } = opts;

  const [state, setState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  const onErrorRef = useRef(opts.onError);
  const onEndedRef = useRef(opts.onEnded);
  useEffect(() => {
    onErrorRef.current = opts.onError;
    onEndedRef.current = opts.onEnded;
  });

  const cleanup = useCallback(() => {
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;

    try {
      pcRef.current?.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {
          /* */
        }
      });
    } catch {
      /* */
    }
    try {
      pcRef.current?.close();
    } catch {
      /* */
    }
    pcRef.current = null;

    setLocalStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream(null);
  }, []);

  const hangup = useCallback(() => {
    if (sessionId && socketRef.current) {
      socketRef.current.emit('hangup', { sessionId });
    }
    cleanup();
    setState('ended');
    onEndedRef.current?.();
  }, [cleanup, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setState('connecting');

    (async () => {
      try {
        const ice = await getIceServers();
        const pc = new RTCPeerConnection({ iceServers: ice.iceServers });
        pcRef.current = pc;

        const media = await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user' },
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(media as unknown as MediaStream);
        media.getTracks().forEach((track) => pc.addTrack(track, media));

        // @ts-expect-error react-native-webrtc usa el evento custom de stream
        pc.ontrack = (event: { streams: MediaStream[] }) => {
          const [stream] = event.streams;
          if (stream) setRemoteStream(stream);
        };

        const socket = createSocket('/video');
        socketRef.current = socket;

        // @ts-expect-error tipo de candidato del binding nativo
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', {
              sessionId,
              candidate: event.candidate.toJSON
                ? event.candidate.toJSON()
                : event.candidate,
            });
          }
        };

        // @ts-expect-error connectionState existe en RN webrtc
        pc.onconnectionstatechange = () => {
          // @ts-expect-error connectionState existe en RN webrtc
          const cs = pc.connectionState as string;
          if (cs === 'connected') setState('active');
          else if (cs === 'failed' || cs === 'disconnected' || cs === 'closed') {
            setState((prev) => (prev === 'ended' ? prev : 'ended'));
          }
        };

        socket.on('peer-joined', async () => {
          if (role === 'caller') {
            const offer = await pc.createOffer({});
            await pc.setLocalDescription(offer);
            socket.emit('offer', { sessionId, sdp: offer });
          }
        });

        socket.on('offer', async (payload: { sdp: RTCSessionDescriptionInit }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          for (const cand of pendingIceRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => undefined);
          }
          pendingIceRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { sessionId, sdp: answer });
        });

        socket.on('answer', async (payload: { sdp: RTCSessionDescriptionInit }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        });

        socket.on('ice-candidate', async (payload: { candidate: RTCIceCandidateInit }) => {
          if (pc.remoteDescription) {
            await pc
              .addIceCandidate(new RTCIceCandidate(payload.candidate))
              .catch(() => undefined);
          } else {
            pendingIceRef.current.push(payload.candidate);
          }
        });

        socket.on('hangup', () => {
          cleanup();
          setState('ended');
          onEndedRef.current?.();
        });

        socket.on('connect', () => {
          socket.emit('join-session', { sessionId });
        });

        socket.connect();
        setState('ringing');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al iniciar video.';
        onErrorRef.current?.(msg);
        cleanup();
        setState('ended');
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [sessionId, role, cleanup]);

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => {
      const next = !prev;
      localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, [localStream]);

  const switchCamera = useCallback(() => {
    // react-native-webrtc agrega `_switchCamera` a los video tracks.
    localStream?.getVideoTracks().forEach((track) => {
      // @ts-expect-error método específico del binding nativo
      track._switchCamera?.();
    });
  }, [localStream]);

  return {
    state,
    localStream,
    remoteStream,
    micOn,
    cameraOn,
    toggleMic,
    toggleCamera,
    switchCamera,
    hangup,
  };
}
