export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface NewUser {
  name: string;
  email: string;
  role: UserRole;
  temporaryPassword: string;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface AccountJob {
  id: string;
  fileName: string;
  status: JobStatus;
  totalAccounts: number;
  processedAccounts: number;
  createdAt: string;
  errorMessage?: string;
}
