// Endpoints de la sala de espera (sólo para paciente).
import { http } from './client';

export type WaitingRoomEntry = {
  _id: string;
  patient: string;
  reason?: string;
  joinedAt: string;
};

export async function joinWaitingRoom(reason?: string): Promise<WaitingRoomEntry> {
  const { data } = await http.post<WaitingRoomEntry>('/waiting-room/join', { reason });
  return data;
}

export async function leaveWaitingRoom(): Promise<void> {
  await http.delete('/waiting-room/leave');
}

export async function getWaitingPosition(): Promise<number> {
  const { data } = await http.get<{ position: number }>('/waiting-room/position');
  return data.position;
}
