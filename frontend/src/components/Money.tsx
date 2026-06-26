/** Formats minor units (piastres) as an EGP amount. 1 EGP = 100 piastres. */
export function formatMoney(minorUnits: number): string {
  return `${(minorUnits / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EGP`;
}

export function Money({ amount }: { amount: number }) {
  return <span className="money">{formatMoney(amount)}</span>;
}
