export const formatSEK = (amount: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatMonthYear = (monthYear: string): string => {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year, month - 1);
  const formatted = date.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const getCurrentMonthYear = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getAdjacentMonth = (monthYear: string, direction: 1 | -1): string => {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year, month - 1 + direction);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
