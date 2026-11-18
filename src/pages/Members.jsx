import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import { isMemberBlocked } from '../utils/memberStatus';
import {
  Plus, Search, X, User,
  AlertCircle, CheckCircle, Clock, XCircle, Eye, Edit3, Trash2,
  ChevronLeft, ChevronRight, RefreshCw, Phone,
  Shield, ShieldOff, CreditCard, MessageCircle, Pause
} from 'lucide-react';

import { getMemberWhatsAppMessage, handleWhatsAppClick, formatPhoneNumber } from '../utils/whatsappUtils';
import { useImagePreview } from '../context/ImagePreviewContext';

const PER_PAGE = 10;

// ── Renew Modal ───────────────────────────────────────────────────────────────

const PRESET_PACKAGES = [
  { id: 'basic',    label: 'Basic',    price: 1000, months: 1  },
  { id: 'standard', label: 'Standard', price: 2500, months: 3  },
  { id: 'premium',  label: 'Premium',  price: 4500, months: 6  },
  { id: 'offer',    label: 'Offer',    price: 7500, months: 12 },
];

const RenewModal = ({ member, onClose }) => {
  const navigate = useNavigate();

  // Derive the member's last plan from member.packages field
  const lastPkg = (member.packages || '').trim();
  const matchedPreset = PRESET_PACKAGES.find(
    p => p.label.toLowerCase() === lastPkg.toLowerCase()
  );

  // Derive last duration in months from endDate - startDate
  const lastMonths = (() => {
    if (!member.startDate || !member.endDate) return null;
    const diff = Math.round(
      (new Date(member.endDate) - new Date(member.startDate)) / (1000 * 60 * 60 * 24 * 30.44)
    );
    return diff > 0 ? diff : null;
  })();

  const handleSamePlan = () => {
    onClose();
    navigate('/payments/new', {
      state: {
        renewMember:   member,
        renewPackage:  matchedPreset?.id || 'custom',
        renewPkgLabel: lastPkg,
        renewMonths:   lastMonths || matchedPreset?.months || 1,
        renewAmount:   matchedPreset?.price || '',
        isRenewal:     true,
      },
    });
  };

  const handleDifferentPlan = () => {
    onClose();
    navigate('/payments/new', {
      state: {
        renewMember: member,
        isRenewal:   true,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-red-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} />
            <div>
              <p className="font-bold text-sm">Renew Membership</p>
              <p className="text-xs opacity-60">{member.name}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={16} className="opacity-60 hover:opacity-100" /></button>
        </div>

        <div className="p-5">
          {/* Current plan info */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Current Plan</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">{lastPkg || '—'}</span>
              {lastMonths && (
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  {lastMonths} month{lastMonths > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {matchedPreset && (
              <p className="text-xs text-slate-500 mt-0.5">₹{matchedPreset.price.toLocaleString('en-IN')} · {matchedPreset.months} month{matchedPreset.months > 1 ? 's' : ''}</p>
            )}
          </div>

          <p className="text-sm font-semibold text-slate-700 mb-3">Renew with the same plan?</p>

          <div className="flex flex-col gap-2.5">
            {matchedPreset ? (
              <button
                onClick={handleSamePlan}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all"
              >
                <span>✅ Yes — same plan &amp; duration</span>
                <span className="text-xs opacity-80 bg-white/20 px-2 py-0.5 rounded-full">
                  ₹{matchedPreset.price.toLocaleString('en-IN')}
                </span>
              </button>
            ) : (
              <button
                onClick={handleDifferentPlan}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all"
              >
                <RefreshCw size={14} /> Renew (Custom Plan)
              </button>
            )}

            <button
              onClick={handleDifferentPlan}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 active:scale-95 transition-all"
            >
              Choose a different plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Member status helpers ─────────────────────────────────────────────────────

const getMembershipStatus = (endDate, member = null) => {
  if (member?.isOnHold || member?.status === 'hold') {
    const days = member.frozenRemainingDays ?? 0;
    return {
      label: `On Hold (${days}d frozen)`,
      color: 'bg-blue-100 text-blue-700',
      dot: 'bg-blue-500',
      icon: Pause
    };
  }
  if (!endDate) return { label: 'Unknown', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', icon: AlertCircle };
  const diffDays = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { label: 'Expired',             color: 'bg-red-100 text-red-700',     dot: 'bg-red-500',     icon: XCircle };
  if (diffDays <= 7) return { label: `Expires in ${diffDays}d`, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', icon: Clock };
  return                    { label: `${diffDays} days remaining`, color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle };
};

const Avatar = ({ src, name, size = 'md' }) => {
  const [err, setErr] = useState(false);
  const sizeClass = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-12 h-12 text-base';
  const initials  = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  const colors    = ['bg-red-500','bg-blue-500','bg-violet-500','bg-amber-500','bg-emerald-500','bg-pink-500'];
  const color     = colors[(name?.charCodeAt(0) || 0) % colors.length];
  if (src && !err)
    return <img src={src} alt={name} onError={() => setErr(true)} className={`${sizeClass} rounded-full object-cover ring-2 ring-white shadow`} />;
  return <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white shadow`}>{initials}</div>;
};

const MemberCard = ({ member, onEdit, onDelete, onRenew, isBlocked, onToggleBlock }) => {
  const navigate = useNavigate();
  const { openImagePreview } = useImagePreview();
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isTrainer = loggedInUser?.role === 'trainer';
  const status = getMembershipStatus(member.endDate, member);
  const StatusIcon = status.icon;
  const hasPhoto = !!member.images?.profileImage;

  const waMessage = getMemberWhatsAppMessage(member);
  const isValidPhone = !!formatPhoneNumber(member.phone);

  return (
    <div
      onClick={() => navigate(`/members/${member._id}`)}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="relative flex-shrink-0 cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            if (hasPhoto) {
              openImagePreview(member.images.profileImage, member.name);
            } else {
              navigate(`/members/${member._id}`);
            }
          }}
          title={hasPhoto ? "Click to view full photo" : "View profile"}
        >
          <Avatar src={member.images?.profileImage} name={member.name} />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${status.dot}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate group-hover:text-red-600 transition-colors">{member.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-500">{member.age} yrs</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500">{member.gender}</span>
            {member.packages && <><span className="text-slate-300">·</span><span className="text-xs text-slate-500 truncate">{member.packages}</span></>}
            {member.startDate && <><span className="text-slate-300">·</span><span className="text-xs text-slate-500 truncate">Start: {new Date(member.startDate).toLocaleDateString('en-IN')}</span></>}
            {member.endDate && <><span className="text-slate-300">·</span><span className="text-xs text-slate-500 truncate">End: {new Date(member.endDate).toLocaleDateString('en-IN')}</span></>}
            {member.attendanceId && <><span className="text-slate-300">·</span><span className="text-xs text-blue-500 font-mono">ID:{member.attendanceId}</span></>}
            {!isTrainer && member.phone && <><span className="text-slate-300">·</span><span className="text-xs text-slate-500 flex items-center gap-1"><Phone size={11} className="text-slate-400" />{member.phone}</span></>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap mt-2 sm:mt-0 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
          <StatusIcon size={10} />{status.label}
        </span>
        {isBlocked && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
            <ShieldOff size={10} /> Blocked
          </span>
        )}
        {!isTrainer && waMessage && (
          <button onClick={e => { e.stopPropagation(); handleWhatsAppClick(member.phone, waMessage); }}
            disabled={!isValidPhone}
            className={`p-1.5 rounded-lg transition ${isValidPhone ? 'text-green-500 hover:text-green-600 hover:bg-green-50' : 'text-slate-300 cursor-not-allowed'}`}
            title={isValidPhone ? 'Send WhatsApp Message' : 'No valid phone number'}>
            <MessageCircle size={14} />
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onToggleBlock(member); }}
          className={`p-1.5 rounded-lg transition ${isBlocked ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`} title={isBlocked ? 'Unblock member' : 'Block member'}>
          {isBlocked ? <ShieldOff size={14} /> : <Shield size={14} />}
        </button>
        <button onClick={e => { e.stopPropagation(); onRenew(member); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition" title="Renew membership">
          <RefreshCw size={14} />
        </button>
        <button onClick={e => { e.stopPropagation(); onEdit(member); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Edit member">
          <Edit3 size={14} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(member); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete member">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const DeleteModal = ({ member, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600" /></div>
      <h3 className="font-bold text-slate-900 text-lg mb-1">Delete Member?</h3>
      <p className="text-slate-500 text-sm mb-5">Are you sure you want to delete <strong>{member?.name}</strong>? This cannot be undone.</p>
      <div className="flex gap-3">
        <button onClick={onClose}   className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

const Pagination = ({ page, totalPages, filtered: filteredCount, onPage }) => {
  if (totalPages <= 1) return null;
  const start = Math.min((page-1)*PER_PAGE+1, filteredCount);
  const end   = Math.min(page*PER_PAGE, filteredCount);
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-slate-400">Showing {start}–{end} of {filteredCount}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(p => Math.max(1, p-1))} disabled={page===1}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition">
          <ChevronLeft size={14} className="text-slate-600"/>
        </button>
        {Array.from({length: totalPages}, (_, i) => i+1)
          .filter(n => n===1 || n===totalPages || Math.abs(n-page)<=1)
          .reduce((acc, n, idx, arr) => {
            if (idx > 0 && n - arr[idx-1] > 1) acc.push('…');
            acc.push(n);
            return acc;
          }, [])
          .map((n, i) => n === '…'
            ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
            : <button key={n} onClick={() => onPage(n)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${page===n ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {n}
              </button>
          )}
        <button onClick={() => onPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition">
          <ChevronRight size={14} className="text-slate-600"/>
        </button>
      </div>
    </div>
  );
};

// ── Main Members Page ─────────────────────────────────────────────────────────

const Members = () => {
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isTrainer = loggedInUser?.role === 'trainer';
  const [members,      setMembers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renewTarget,  setRenewTarget]  = useState(null);
  const [blockEntries, setBlockEntries] = useState([]);
  const [page,         setPage]         = useState(() => Number(sessionStorage.getItem('membersListPage')) || 1);

  const isFirstRender = useRef(true);
  useEffect(() => { fetchMembers(); }, []);
  useEffect(() => { sessionStorage.setItem('membersListPage', String(page)); }, [page]);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPage(1);
  }, [filter, search]);

  const fetchMembers = async () => {
    try {
      const [membersRes, blockRes] = await Promise.allSettled([
        CustomBaseUrl.get('/fetch'),
        CustomBaseUrl.get('/block-list'),
      ]);

      let baseList = [];
      if (membersRes.status === 'fulfilled') {
        baseList = membersRes.value.data?.data || [];
        baseList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMembers(baseList);
      }

      if (blockRes.status === 'fulfilled') {
        const entries = blockRes.value.data?.data || [];
        setBlockEntries(entries);

        // Fetch registration details for blocked entries so they are visible under Blocked tab
        const blockedIds = Array.from(new Set(entries.map(e => e.registrationId).filter(Boolean)));
        if (blockedIds.length > 0) {
          try {
            const blockedFetches = await Promise.all(blockedIds.map(id =>
              CustomBaseUrl.get(`/fetchone/${id}`).then(r => r.data?.data).catch(() => null)
            ));
            const blockedRegs = blockedFetches.filter(Boolean);
            if (blockedRegs.length > 0) {
              setMembers(prev => {
                const existingIds = new Set(prev.map(m => String(m._id)));
                const merged = [...blockedRegs.filter(b => !existingIds.has(String(b._id))), ...prev];
                merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                return merged;
              });
            }
          } catch (e) {
            console.error('Failed to fetch blocked registrations:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member) => navigate('/register', { state: { editData: member } });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await CustomBaseUrl.post(`/delete/${deleteTarget._id}`);
      setMembers(prev => prev.filter(m => m._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatus = (m) => {
    if (m?.isOnHold || m?.status === 'hold') return 'hold';
    const diff = Math.ceil((new Date(m.endDate) - new Date()) / 86400000);
    if (diff < 0)  return 'expired';
    if (diff <= 7) return 'expiring';
    return 'active';
  };

  const handleBlockToggle = async (member) => {
    const existingEntry = blockEntries.find(entry => {
      const entryId = entry.registrationId ? String(entry.registrationId) : '';
      const entryPhone = (entry.memberPhone || '').trim();
      return Boolean((entryId && String(member._id) && entryId === String(member._id)) || (entryPhone && (entryPhone === String(member.phone || '').trim())));
    });

    if (existingEntry) {
      try {
        await CustomBaseUrl.delete(`/block-list/${existingEntry._id}`);
        setBlockEntries(prev => prev.filter(entry => entry._id !== existingEntry._id));
        // Refresh the registration record so its status is updated in the members list
        if (existingEntry.registrationId) {
          try {
            const res = await CustomBaseUrl.get(`/fetchone/${existingEntry.registrationId}`);
            const updated = res.data?.data;
            if (updated) {
              setMembers(prev => prev.map(m => (String(m._id) === String(updated._id) ? updated : m)));
            }
          } catch (e) {
            console.error('Failed to refresh member after unblock:', e);
          }
        }
      } catch (err) {
        alert('Unblock failed: ' + (err.response?.data?.message || err.message));
      }
      return;
    }

    try {
      const res = await CustomBaseUrl.post('/block-list', {
        registrationId: member._id,
        memberName: member.name,
        memberPhone: member.phone || '',
        reason: 'Blocked from member list',
      });
      if (res.data?.success) {
        const newEntry = res.data.data;
        setBlockEntries(prev => [newEntry, ...prev]);
        // Mark the member locally as blocked so counts and lists update immediately
        if (member._id) {
          setMembers(prev => prev.map(m => String(m._id) === String(member._id) ? { ...m, status: 'blocked' } : m));
        }
      }
    } catch (err) {
      alert('Block failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const isBlocked = isMemberBlocked(m, blockEntries);
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(q) ||
      (!isTrainer && m.phone?.includes(q)) ||
      m.emails?.toLowerCase().includes(q);
    const matchFilter = filter === 'all'
      ? true
      : filter === 'blocked'
        ? isBlocked
        : filter === 'top10'
          ? (!isBlocked && m.isTop10)
          : (!isBlocked && getStatus(m) === filter);
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const blockedCount = blockEntries.length;
  const counts = {
    all:      members.length,
    active:   members.filter(m => m.status !== 'blocked' && getStatus(m) === 'active').length,
    hold:     members.filter(m => m.status !== 'blocked' && getStatus(m) === 'hold').length,
    top10:    members.filter(m => m.status !== 'blocked' && m.isTop10).length,
    expiring: members.filter(m => m.status !== 'blocked' && getStatus(m) === 'expiring').length,
    expired:  members.filter(m => m.status !== 'blocked' && getStatus(m) === 'expired').length,
    blocked:  blockedCount,
  };

  return (
    <div className="min-h-screen bg-slate-300 ">
      <Navbar />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Members</h1>
            <p className="text-slate-500 text-sm mt-0.5">{members.length} total registered · {blockedCount} blocked</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:w-auto">
            <button onClick={() => navigate('/payments')}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all text-sm font-semibold shadow-sm">
              <CreditCard size={15} /> <span className="hidden sm:inline">Payments</span><span className="sm:hidden">Pay</span>
            </button>
            <button onClick={() => navigate('/register')}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 active:scale-95 transition-all text-sm font-semibold shadow-sm">
              <Plus size={16} /> <span className="hidden sm:inline">Add Member</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input name="search" aria-label="Search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isTrainer ? "Search by name or email…" : "Search by name, phone or email…"}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 text-sm shadow-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { key:'all',      label:'All',      color:'text-slate-700'  },
            { key:'active',   label:'Active',   color:'text-emerald-600'},
            { key:'hold',     label:'On Hold',  color:'text-blue-600'   },
            { key:'top10',    label:'Top 10',   color:'text-amber-500'  },
            { key:'expiring', label:'Expiring', color:'text-amber-600'  },
            { key:'expired',  label:'Expired',  color:'text-red-600'    },
            { key:'blocked',  label:'Blocked',  color:'text-red-600'    },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}>
              {tab.label}
              <span className={`text-xs ${filter === tab.key ? 'text-slate-300' : tab.color}`}>{counts[tab.key]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <User size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No members found</p>
            <p className="text-sm mt-1">{search ? 'Try a different search' : 'Add your first member'}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {paginated.map(member => (
                <MemberCard
                  key={member._id}
                  member={member}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onRenew={setRenewTarget}
                  isBlocked={isMemberBlocked(member, blockEntries)}
                  onToggleBlock={handleBlockToggle}
                />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} filtered={filtered.length} onPage={setPage} />
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal member={deleteTarget} onConfirm={handleDeleteConfirm} onClose={() => setDeleteTarget(null)} />
      )}

      {renewTarget && (
        <RenewModal member={renewTarget} onClose={() => setRenewTarget(null)} />
      )}
    </div>
  );
};

export default Members;

