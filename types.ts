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

export interface DaySchedule {
    day: string; // e.g., "monday", "wednesday"
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
  remainingSessions?: number | null;
  profilePictureUrl?: string | null;
  trainerId: string;
  schedule?: DaySchedule[] | null;
  remindersSent?: { [key: string]: string }; // e.g., { 'sessions_3': '2023-10-27T10:00:00Z' }
  birthDate?: string | null; // ISO string format
  accessBlocked?: boolean;
  groupIds?: string[];
}

export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Cartão de Crédito' | 'Transferência';

export interface Payment {
    id: string;
    studentId: string;
    studentName: string; // Denormalized for easier display
    planId: string;
    planName: string; // Denormalized for a easier display
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

export interface Exercise {
    id: string;
    name: string;
    sets: string;
    reps: string;
    rest: string;
    notes: string;
    youtubeUrl?: string;
    isHidden?: boolean;
    studentFeedback?: string;
}

export interface Workout {
    id: string;
    studentId: string;
    trainerId: string;
    title: string;
    exercises: Exercise[];
    createdAt: string; // ISO string
    completedExerciseIds?: string[];
}

export interface WorkoutTemplate {
    id: string;
    trainerId: string;
    title: string;
    exercises: Exercise[];
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

export interface StudentGroup {
  id: string;
  name: string;
  trainerId: string;
}

export interface PendingStudent {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string | null; // ISO string format
  trainerId: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string; // ISO string format
}

export type InvoiceStatus = 'Paga' | 'Em Aberto' | 'Vencida';

export interface Invoice {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // ISO string
  paidDate?: string | null; // ISO string
  status: InvoiceStatus;
}

export interface LibraryExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  youtubeUrl?: string;
}

export interface TrainerSuggestion {
  id: string; // Document ID
  trainerId: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string; // ISO String
  // Denormalized exercise data for easier display and searching
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  youtubeUrl?: string;
}