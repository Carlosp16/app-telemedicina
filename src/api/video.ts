// -----------------------------------------------------------------------------
// Cliente HTTP de video. La señalización SDP/ICE va por el Socket.io
// /video; estos endpoints son solo para crear/aceptar/rechazar/terminar
// la sesión.
// -----------------------------------------------------------------------------
import { http } from './client';

export interface VideoSession {
  _id: string;
  case: string;
  patient: string;
  doctor: string;
  status: 'ringing' | 'active' | 'ended' | 'rejected';
  startedAt?: string;
  endedAt?: string;
}

export interface StartCallResponse {
  session: VideoSession;
  case: { _id: string };
}

export interface IceServersConfig {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
}

export async function startCallForCase(caseId: string): Promise<StartCallResponse> {
  const { data } = await http.post<StartCallResponse>(`/video/cases/${caseId}/start`);
  return data;
}

export async function acceptCall(sessionId: string): Promise<VideoSession> {
  const { data } = await http.post<VideoSession>(`/video/${sessionId}/accept`);
  return data;
}

export async function rejectCall(sessionId: string): Promise<VideoSession> {
  const { data } = await http.post<VideoSession>(`/video/${sessionId}/reject`);
  return data;
}

export async function endCall(sessionId: string): Promise<VideoSession> {
  const { data } = await http.post<VideoSession>(`/video/${sessionId}/end`);
  return data;
}

export async function getIceServers(): Promise<IceServersConfig> {
  const { data } = await http.get<IceServersConfig>('/auth/ice-servers');
  return data;
}
