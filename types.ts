
export interface User {
  id: string;
  name: string;
  age: number;
  address: string;
  phone: string;
  email: string;
  occupation: string;
  passwordHash: string;
  profilePicture?: string; // base64 string
  idDocument?: string;
}

export enum ItemType {
  LOAN = 'Préstamo',
  RENTAL = 'Arriendo',
  DEBT = 'Deuda',
  OTHER = 'Otro Ingreso'
}

export interface Payment {
  id:string;
  amount: number;
  date: string;
  method: string;
  receiptGenerated: boolean;
  allocation?: 'capital' | 'interes'; // Específico para préstamos
}

export interface FinancialItem {
  id: string;
  type: ItemType;
  
  // Datos de la persona
  personName: string;
  personId?: string;
  personPhone?: string;

  description: string;
  startDate: string;
  payments: Payment[];
  dueDate?: string; // Para deudas

  // Campos específicos para Préstamos
  principal?: number;
  interestRate?: number;
  term?: string;

  // Campos específicos para Arriendos
  monthlyAmount?: number;
  paymentDay?: number; // Día del mes para el pago
}

export interface Reminder {
    id: string;
    text: string;
    date: string;
    completed: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  balance: number;
}

export interface InvoiceDetails {
  amount: number;
  concept: string;
  dueDate: string;
}

export type AppView = 'register' | 'login' | 'dashboard' | 'detail' | 'financial-summary' | 'forgot-password' | 'settings';

export type ModalType = 'add-item' | 'add-payment' | 'add-reminder' | 'add-account' | 'generate-invoice' | null;