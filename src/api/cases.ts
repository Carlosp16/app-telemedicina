// Endpoints de casos clínicos (compartidos entre paciente y médico).
import { http } from './client';

export type CaseType = 'chat' | 'video';
export type CaseStatus = 'pending' | 'active' | 'closed';

export type PopulatedDoctor = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  specialty?: string;
};

export type CaseSummary = {
  _id: string;
  patient: string;
  doctor?: string | PopulatedDoctor;
  type: CaseType;
  status: CaseStatus;
  reason?: string;
  diagnosis?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

export async function listMyCases(): Promise<CaseSummary[]> {
  const { data } = await http.get<CaseSummary[]>('/cases/mine');
  return data;
}

export async function getCase(id: string): Promise<CaseSummary> {
  const { data } = await http.get<CaseSummary>(`/cases/${id}`);
  return data;
}
