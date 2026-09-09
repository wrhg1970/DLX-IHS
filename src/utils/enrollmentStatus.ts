export type CourseGradeOutcome = 'Pass' | 'Fail' | 'Pendiente';

export type EnrollmentStatus = 'Active' | 'Ended' | 'Extended' | 'Completed' | 'On hold' | 'Withdrawn';

export interface EnrollmentStatusInput {
  id?: number;
  startDate?: string;
  endDate?: string;
  enrollmentDate?: string;
  activationDate?: string;
  status?: string;
  gradeOutcome?: CourseGradeOutcome | string;
  finalGrade?: string;
  hasExtension?: boolean;
  extensionDate?: string;
}

/**
 * Normalizes any date string into a clean YYYY-MM-DD string for safe lexicographical comparison.
 */
export function normalizeDateToISO(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Automatically calculates and returns the status of an enrollment according to business rules:
 * 
 * 1. Completed: La clase ya fue calificada con Pass/Fail.
 * 2. Extended: Se seleccionó la extensión y la fecha de hoy es anterior a la fecha de extensión.
 * 3. Ended: La fecha de hoy después de la fecha de expiración (o posterior a la fecha de extensión).
 * 4. Active: La fecha de hoy está entre la fecha de activación y la fecha de expiración.
 */
export function calculateEnrollmentStatus(
  enrollment: EnrollmentStatusInput,
  todayDateStr?: string
): EnrollmentStatus {
  // 1. Completed: La clase ya fue calificada con Pass/Fail
  const outcome = enrollment.gradeOutcome;
  if (outcome === 'Pass' || outcome === 'Fail') {
    return 'Completed';
  }
  if (enrollment.status === 'Completed' && (outcome === 'Pass' || outcome === 'Fail' || Boolean(enrollment.finalGrade))) {
    return 'Completed';
  }

  // Preserve Withdrawn if manually registered and not graded
  if (enrollment.status === 'Withdrawn') {
    return 'Withdrawn';
  }

  const today = normalizeDateToISO(todayDateStr) || getTodayISODate();
  const activation = normalizeDateToISO(enrollment.activationDate || enrollment.startDate);
  const expiration = normalizeDateToISO(enrollment.endDate);
  const extension = normalizeDateToISO(enrollment.extensionDate);

  // 2. Extended: Se seleccionó la extensión y la fecha de hoy es anterior a la fecha de extensión
  if (enrollment.hasExtension) {
    if (extension) {
      if (today <= extension) {
        return 'Extended';
      } else {
        // Today is past the extension date -> the extended period has ended
        return 'Ended';
      }
    } else {
      // hasExtension is true but extensionDate not yet populated
      // Check if expiration is defined: if today > expiration, extension is actively granting grace period
      return 'Extended';
    }
  }

  // 3. Ended: La fecha de hoy es posterior a la fecha de expiración
  if (expiration && today > expiration) {
    return 'Ended';
  }

  // 4. Active: La fecha de hoy está entre la fecha de activación y la fecha de expiración
  if (activation && expiration) {
    if (today >= activation && today <= expiration) {
      return 'Active';
    }
    if (today < activation) {
      // Future activation date
      return enrollment.status === 'On hold' ? 'On hold' : 'Active';
    }
  }

  // If expiration is defined and today <= expiration
  if (expiration && today <= expiration) {
    return 'Active';
  }

  // Default fallback
  return 'Active';
}

/**
 * Returns styling and descriptive properties for enrollment status badges.
 */
export function getEnrollmentStatusBadge(status?: string): {
  label: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  description: string;
} {
  switch (status) {
    case 'Active':
      return {
        label: 'Active',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        borderClass: 'border-emerald-200',
        description: 'Vigente (dentro del periodo de activación y expiración)',
      };
    case 'Extended':
      return {
        label: 'Extended',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dotClass: 'bg-indigo-500 animate-pulse',
        borderClass: 'border-indigo-200',
        description: 'Extensión activa (anterior a la fecha de extensión)',
      };
    case 'Ended':
      return {
        label: 'Ended',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        borderClass: 'border-rose-200',
        description: 'Finalizada (fecha posterior a la expiración)',
      };
    case 'Completed':
      return {
        label: 'Completed',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotClass: 'bg-blue-500',
        borderClass: 'border-blue-200',
        description: 'Completada (calificada con Pass o Fail)',
      };
    case 'On hold':
      return {
        label: 'On hold',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
        borderClass: 'border-amber-200',
        description: 'En espera / En pausa',
      };
    case 'Withdrawn':
      return {
        label: 'Withdrawn',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
        borderClass: 'border-slate-200',
        description: 'Baja del curso',
      };
    default:
      return {
        label: status || 'Active',
        badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
        dotClass: 'bg-slate-400',
        borderClass: 'border-slate-200',
        description: 'Estatus general',
      };
  }
}
