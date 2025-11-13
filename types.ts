export type PlanType = 'duration' | 'session';

export interface Plan {
  id: string;
  name: string;
  price: number;
  type: PlanType;
  durationInDays?: number; // e.g., 30 for monthly
  numberOfSessions?: number; // e.g., 10 sessions
  trainerId: string;
}

export type ClassSessionType = 'regular' | 'extra' | 'absent';

export interface ClassSession {
  id: string;
  date: string; // ISO string format
  type: ClassSessionType;
}

export interface Schedule {
    days: string[]; // e.g., ["monday", "wednesday", "friday"]
    startTime: string; // e.g., "09:00"
    endTime: string; // e.g., "10:00"
}

export interface Student {
  id:string;
  name: string;
  email: string;
  phone: string;
  startDate: string; // ISO string format
  planId: string | null;
  paymentDueDate: string | null; // ISO string format
  sessions: ClassSession[];
  remainingSessions?: number;
  profilePictureUrl?: string | null;
  trainerId: string;
  schedule?: Schedule | null;
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
    trainerId: string;
}

export interface Trainer {
    id: string;
    username: string;
    password?: string; // Should be handled securely, only for creation
    fullName?: string;
    contactEmail?: string;
    instagram?: string; // e.g., 'username' without @
    whatsapp?: string; // e.g., '5511999998888'
}

export interface Workout {
    id: string;
    studentId: string;
    trainerId: string;
    title: string;
    description: string;
    youtubeUrl?: string;
    createdAt: string; // ISO string
}

export interface StudentFile {
    id: string;
    studentId: string;
    trainerId: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string; // ISO string
}

export interface ProgressPhoto {
    id: string;
    studentId: string;
    trainerId: string;
    photoUrl: string;
    studentNotes?: string;
    trainerFeedback?: string;
    uploadedAt: string; // ISO string
}