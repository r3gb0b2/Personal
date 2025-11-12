export type PlanType = 'duration' | 'session';

export interface Plan {
  id: string;
  name: string;
  price: number;
  type: PlanType;
  durationInDays?: number; // e.g., 30 for monthly
  numberOfSessions?: number; // e.g., 10 sessions
}

export type ClassSessionType = 'regular' | 'extra' | 'absent';

export interface ClassSession {
  id: string;
  date: string; // ISO string format
  type: ClassSessionType;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  startDate: string; // ISO string format
  planId: string | null;
  paymentDueDate: string | null; // ISO string format
  sessions: ClassSession[];
  remainingSessions?: number;
  profilePictureUrl?: string | null;
}

export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Cartão de Crédito' | 'Transferência';

export interface Payment {
    id: string;
    studentId: string;
    studentName: string; // Denormalized for easier display
    planId: string;
    planName: string; // Denormalized for easier display
    amount: number;
    paymentDate: string; // ISO string format
    paymentMethod: PaymentMethod;
}