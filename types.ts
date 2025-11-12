
export interface Plan {
  id: string;
  name: string;
  price: number;
  durationInDays: number; // e.g., 30 for monthly, 90 for quarterly
}

export interface ClassSession {
  id: string;
  date: string; // ISO string format
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
}
