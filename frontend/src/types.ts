/**
 * API contract types — local copy (keep in sync with the other app).
 *
 * Money is in MINOR UNITS (piastres; 1 EGP = 100). Integer math only —
 * never floats — to avoid rounding drift in financial calculations.
 */

export const ALLOWED_MONTHS = [3, 6, 12] as const;
export type Months = (typeof ALLOWED_MONTHS)[number];

export type AgreementStatus = 'active' | 'settled';
export type InstallmentStatus = 'due' | 'paid';

export interface User {
  id: string;
  email: string;
  name: string;
  creditLimit: number; // minor units
}

export interface PlanOption {
  months: Months;
  feeRate: number;        // e.g. 0.05 = 5% flat fee on principal
  totalPayable: number;   // minor units
  monthlyAmount: number;  // minor units (first n-1 installments; last absorbs remainder)
}

export interface Installment {
  id: string;
  seq: number;
  dueDate: string;        // ISO date
  amount: number;         // minor units
  status: InstallmentStatus;
}

export interface Agreement {
  id: string;
  merchant: string;
  principal: number;      // minor units
  months: Months;
  totalPayable: number;   // minor units
  status: AgreementStatus;
  createdAt: string;      // ISO
}

// ---- request / response shapes ----
export interface AuthResponse { token: string; user: User; }
export interface RegisterRequest { email: string; password: string; name: string; }
export interface LoginRequest { email: string; password: string; }

export interface PlansResponse { amount: number; creditLimit: number; options: PlanOption[]; }
export interface CheckoutRequest { amount: number; months: Months; merchant: string; }
export interface AgreementDetail { agreement: Agreement; installments: Installment[]; }

export interface ApiError { error: string; details?: unknown; }
