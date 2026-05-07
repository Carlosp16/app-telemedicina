// Endpoints REST de chat. El envío de mensajes real se hace vía Socket.io.
import { http } from './client';
import type { CaseSummary, PopulatedDoctor } from './cases';

export type ChatMessage = {
  _id: string;
  case: string;
  sender: string;
  kind: 'text' | 'file';
  content?: string;
  fileData?: {
    name: string;
    mimeType: string;
    size: number;
  };
  readBy: string[];
  createdAt: string;
  updatedAt: string;
};

export type StartChatResponse = {
  case: CaseSummary;
  doctor: PopulatedDoctor;
};

export async function startChat(reason?: string): Promise<StartChatResponse> {
  const { data } = await http.post<StartChatResponse>('/chat/start', { reason });
  return data;
}

export async function listMessages(caseId: string): Promise<ChatMessage[]> {
  const { data } = await http.get<ChatMessage[]>(`/chat/cases/${caseId}/messages`);
  return data;
}

export async function markAsRead(caseId: string): Promise<void> {
  await http.post(`/chat/cases/${caseId}/read`);
}
