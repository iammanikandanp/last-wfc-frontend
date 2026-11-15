import { getCalendarDiffDays } from './dateUtils.js';

export const getMembershipStatus = (endDate, member = null) => {
  if (member?.isOnHold || member?.status === 'hold') {
    const frozen = member?.frozenRemainingDays != null ? member.frozenRemainingDays : 0;
    return {
      key: 'hold',
      label: `On Hold (${frozen}d frozen)`,
      color: 'bg-blue-100 text-blue-700 border border-blue-200',
      dot: 'bg-blue-500',
      remainingDays: frozen,
    };
  }

  if (!endDate) {
    return { key: 'unknown', label: 'Unknown', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', remainingDays: 0 };
  }

  const diffDays = getCalendarDiffDays(endDate);

  if (diffDays === null) {
    return { key: 'unknown', label: 'Unknown', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', remainingDays: 0 };
  }

  if (diffDays < 0) {
    return { key: 'expired', label: 'Expired', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', remainingDays: 0 };
  }

  if (diffDays <= 7) {
    return { key: 'expiring', label: `Expires in ${diffDays}d`, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', remainingDays: diffDays };
  }

  return { key: 'active', label: `${diffDays} days remaining`, color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', remainingDays: diffDays };
};

export const isMemberBlocked = (member, blockEntries = []) => {
  if (!member) return false;
  // If backend marks member.status === 'blocked', respect it immediately
  if (member.status === 'blocked' || member.status === 'Blocked') return true;
  const memberId = member._id ? String(member._id) : '';
  const memberPhone = (member.phone || '').trim();

  return (blockEntries || []).some((entry) => {
    const entryId = entry.registrationId ? String(entry.registrationId) : '';
    const entryPhone = (entry.memberPhone || '').trim();
    return Boolean((entryId && memberId && entryId === memberId) || (entryPhone && memberPhone && entryPhone === memberPhone));
  });
};

export const isMemberActive = (member, blockEntries = []) => {
  const status = getMembershipStatus(member?.endDate, member);
  return status.key === 'active' && !isMemberBlocked(member, blockEntries);
};
