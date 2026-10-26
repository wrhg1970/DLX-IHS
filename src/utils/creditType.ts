/**
 * Utility functions and standardization for academic credit types
 * Full Credit (Crédito Completo) and Half Credit (Medio Crédito)
 */

export type CreditType = 
  | 'Full Credit' 
  | 'Half Credit' 
  | 'Full Credit AP' 
  | 'Half Credit AP'
  | 'Crédito completo' 
  | 'Medio Crédito' 
  | 'Crédito completo AP' 
  | 'Medio Crédito AP';

export const CREDIT_TYPE_OPTIONS = [
  { value: 'Full Credit', label: 'Full Credit' },
  { value: 'Half Credit', label: 'Half Credit' },
  { value: 'Full Credit AP', label: 'Full Credit AP' },
  { value: 'Half Credit AP', label: 'Half Credit AP' },
] as const;

export function formatCreditType(type?: string | null): string {
  if (!type) return 'Full Credit';
  const t = type.trim();
  if (t === 'Crédito completo' || t === 'Crédito Completo' || t === 'Full' || t === 'Full Credit') return 'Full Credit';
  if (t === 'Medio Crédito' || t === 'Medio Credito' || t === 'Half' || t === 'Half Credit') return 'Half Credit';
  if (t === 'Crédito completo AP' || t === 'Crédito Completo AP' || t === 'Full Credit AP') return 'Full Credit AP';
  if (t === 'Medio Crédito AP' || t === 'Medio Credito AP' || t === 'Half Credit AP') return 'Half Credit AP';
  return t;
}

export function isHalfCredit(type?: string | null): boolean {
  if (!type) return false;
  return type.includes('Half') || type.includes('Medio');
}

export function isFullCredit(type?: string | null): boolean {
  if (!type) return true;
  return type.includes('Full') || type.includes('Completo');
}

export function isApCredit(type?: string | null): boolean {
  if (!type) return false;
  return type.includes('AP');
}
