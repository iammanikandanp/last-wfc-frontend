export const getMembershipStatus = (endDate) => {
  if (!endDate) {
    return { key: 'unknown', label: 'Unknown', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  }

  const diffDays = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { key: 'expired', label: 'Expired', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' };
  }

  if (diffDays <= 7) {
    return { key: 'expiring', label: `Expires in ${diffDays}d`, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
  }

  return { key: 'active', label: `${diffDays} days remaining`, color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
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
  const status = getMembershipStatus(member?.endDate);
  return status.key === 'active' && !isMemberBlocked(member, blockEntries);
};
