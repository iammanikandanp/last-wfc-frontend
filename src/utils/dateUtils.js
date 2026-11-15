// Utility functions for consistent calendar date calculations and membership extensions

/**
 * Parses a date into a local Date object (year, month, day at 00:00:00 local time).
 * Avoids UTC offset rollback bugs caused by new Date('YYYY-MM-DD').
 */
export const parseLocalDate = (d) => {
  if (!d) return null;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

/**
 * Formats a Date object or date string into local 'YYYY-MM-DD'.
 */
export const toLocalDateStr = (dt) => {
  if (!dt) return '';
  const d = dt instanceof Date ? dt : new Date(dt);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Formats a date for UI display (e.g. '18 Nov 2026').
 */
export const formatDisplayDate = (d) => {
  if (!d) return '—';
  const dt = parseLocalDate(d);
  if (!dt || isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Adds exact calendar months to a start date.
 * Properly handles month-end clamping (e.g. Jan 31 + 1mo -> Feb 28/29)
 * and leap years without month skipping.
 */
export const addCalendarMonths = (dateInput, months) => {
  const d = parseLocalDate(dateInput);
  if (!d || isNaN(d.getTime())) return '';
  const numMonths = Number(months);
  if (isNaN(numMonths) || numMonths <= 0) return toLocalDateStr(d);

  const startDay = d.getDate();
  const startMonth = d.getMonth();
  const startYear = d.getFullYear();

  const totalMonths = startMonth + numMonths;
  const targetYear = startYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  // Maximum days in target month (handles 28, 29, 30, 31)
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(startDay, daysInTargetMonth);

  return toLocalDateStr(new Date(targetYear, targetMonth, targetDay));
};

/**
 * Returns the day immediately after the given date as 'YYYY-MM-DD'.
 */
export const getDayAfter = (dateInput) => {
  const d = parseLocalDate(dateInput);
  if (!d || isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 1);
  return toLocalDateStr(d);
};

/**
 * Returns difference in whole calendar days (endDate - referenceDate).
 * Positive = remaining days. 0 = ends today. Negative = expired.
 */
export const getCalendarDiffDays = (endDate, referenceDate = new Date()) => {
  if (!endDate) return null;
  const end = parseLocalDate(endDate);
  const ref = parseLocalDate(toLocalDateStr(referenceDate));
  if (!end || !ref || isNaN(end.getTime()) || isNaN(ref.getTime())) return null;
  return Math.round((end.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Evaluates a member's active membership based on actual End Date and payment history.
 * If active / remaining days exist, returns the suggested start date (day after current expiry).
 * If expired or no membership, returns today as start date.
 */
export const getMemberRemainingMembership = (member, payments = [], referenceDate = new Date()) => {
  const todayStr = toLocalDateStr(referenceDate);
  const today = parseLocalDate(todayStr);

  if (!member) {
    return {
      hasActive: false,
      isOnHold: false,
      remainingDays: 0,
      endDate: null,
      suggestedStart: todayStr,
    };
  }

  if (member.isOnHold || member.status === 'hold') {
    return {
      hasActive: false,
      isOnHold: true,
      remainingDays: member.frozenRemainingDays || 0,
      endDate: member.endDate ? toLocalDateStr(member.endDate) : null,
      suggestedStart: todayStr,
    };
  }

  // Find latest end date between member record and any payment records
  let latestEnd = member.endDate ? parseLocalDate(member.endDate) : null;

  if (Array.isArray(payments) && payments.length > 0) {
    payments.forEach(p => {
      if (p && p.endDate) {
        const pEnd = parseLocalDate(p.endDate);
        if (pEnd && (!latestEnd || pEnd > latestEnd)) {
          latestEnd = pEnd;
        }
      }
    });
  }

  if (!latestEnd || member.status === 'blocked') {
    return {
      hasActive: false,
      remainingDays: 0,
      endDate: latestEnd ? toLocalDateStr(latestEnd) : null,
      suggestedStart: todayStr,
    };
  }

  const diffMs = latestEnd.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // If end date is today or in future (diffDays >= 0):
  // The member still has active membership time remaining.
  // The new package must start the day after current membership End Date.
  if (diffDays >= 0) {
    return {
      hasActive: true,
      remainingDays: diffDays,
      endDate: toLocalDateStr(latestEnd),
      suggestedStart: getDayAfter(latestEnd),
    };
  }

  // End date is in the past: membership expired
  return {
    hasActive: false,
    remainingDays: 0,
    endDate: toLocalDateStr(latestEnd),
    suggestedStart: todayStr,
  };
};

