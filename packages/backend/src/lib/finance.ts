import { ALLOWED_MONTHS, Months, PlanOption } from '@bnpl/shared';

/** Flat fee on principal by term. Integer math throughout (minor units). */
const FEE_BY_MONTHS: Record<Months, number> = { 3: 0, 6: 0.05, 12: 0.12 };

export function planOptions(principal: number): PlanOption[] {
  return ALLOWED_MONTHS.map((months) => {
    const feeRate = FEE_BY_MONTHS[months];
    const totalPayable = Math.round(principal * (1 + feeRate));
    const monthlyAmount = Math.floor(totalPayable / months);
    return { months, feeRate, totalPayable, monthlyAmount };
  });
}

export interface ScheduleRow { seq: number; dueDate: Date; amount: number; }

/** Equal installments; the LAST one absorbs the rounding remainder so the sum is exact. */
export function buildSchedule(totalPayable: number, months: Months, start: Date): ScheduleRow[] {
  const base = Math.floor(totalPayable / months);
  const remainder = totalPayable - base * months;
  const rows: ScheduleRow[] = [];
  for (let i = 0; i < months; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    rows.push({ seq: i + 1, dueDate, amount: base + (i === months - 1 ? remainder : 0) });
  }
  return rows;
}
