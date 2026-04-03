import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import {
  Plus, Search, X, User,
  AlertCircle, CheckCircle, Clock, XCircle, Eye, Edit3, Trash2,
  ChevronLeft, ChevronRight, Upload, FileText, Loader2
} from 'lucide-react';

const PER_PAGE = 10;

// ── CSV helpers ───────────────────────────────────────────────────────────────

// Handles quoted fields with commas inside (e.g. "7/24,street, city")
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += line[i]; }
  }
  result.push(current.trim());
  return result;
};

const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1)
    .map(line => {
      const vals = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ''; });
      return obj;
    })
    .filter(row => row.memberName || row.admissionNo);
};

// Extract duration in days from membership string e.g. "Premium 3 months" → 90
const parseDurationDays = (membership) => {
  const m = (membership || '').toLowerCase();
  const match = m.match(/(\d+)\s*month/);
  if (match) return parseInt(match[1]) * 30;
  return 30; // default 1 month
};

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

// Map one CSV row → registration FormData payload
const rowToMemberPayload = (row) => {
  const startDate = row.joiningDate || new Date().toISOString().split('T')[0];
  const duration  = parseDurationDays(row.membership);
  const endDate   = addDays(startDate, duration);

  const fd = new FormData();
  fd.append('name',         row.memberName  || '');
  fd.append('phone',        row.phone       || '');
  fd.append('emails',       row.email && row.email !== '-' ? row.email : '');
  fd.append('gender',       capitalize(row.gender) || 'Male');
  fd.append('bloodGroup',   row.bloodGroup && row.bloodGroup !== '-' ? row.bloodGroup : 'O+');
  fd.append('address',      [row.address, row.city, row.state].filter(v => v && v !== '-').join(', '));
  fd.append('city',         row.city    && row.city    !== '-' ? row.city    : '');
  fd.append('state',        row.state   && row.state   !== '-' ? row.state   : '');
  fd.append('pincode',      row.pincode && row.pincode !== '-' ? row.pincode : '');
  fd.append('attendanceId', row.admissionNo || '');
  fd.append('packages',     row.membership  || 'Basic');
  fd.append('duration',     String(Math.round(duration / 30)));
  fd.append('startDate',    startDate);
  fd.append('endDate',      endDate);
  fd.append('services',     'No');
  fd.append('issues',       'None');
  return { fd, startDate, endDate, duration };
};

// Map one CSV row + registrationId → payment payload
const rowToPaymentPayload = (row, registrationId, startDate, endDate) => {
  const balance = parseFloat(row.balance) || 0;
  return {
    registrationId,
    memberName:    row.memberName || '',
    memberPhone:   row.phone      || '',
    package:       row.membership || '',
    amount:        0,
    discount:      0,
    finalAmount:   0,
    advanceAmount: 0,
    balanceAmount: balance,
    paymentType:   balance > 0 ? 'partly' : 'full',
    paymentMode:   'cash',
    startDate,
    endDate,
    invoiceNo:     `WFC-IMP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
    pdfUrl:        '',
  };
};

// ── CSV Import Modal ──────────────────────────────────────────────────────────
const CSVImportModal = ({ onClose, onDone }) => {
  const fileRef = useRef(null);
  const [rows,     setRows]     = useState([]);
  const [stage,    setStage]    = useState('idle'); // idle | preview | importing | done
  const [results,  setResults]  = useState([]);     // { name, status, error }
  const [progress, setProgress] = useState(0);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setRows(parsed);
      setStage('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStage('importing');
    const res = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const { fd, startDate, endDate } = rowToMemberPayload(row);

        // 1. Register the member
        const regRes = await CustomBaseUrl.post(
          '/register',
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        // Support various response shapes
        const registrationId =
          regRes.data?.data?._id ||
          regRes.data?.member?._id ||
          regRes.data?._id ||
          null;

        // 2. Create payment record (only if we got an id)
        if (registrationId) {
          const payloadPay = rowToPaymentPayload(row, registrationId, startDate, endDate);
          await CustomBaseUrl.post('/reg-payments', payloadPay);
        }

        res.push({ name: row.memberName, admissionNo: row.admissionNo, status: 'ok' });
      } catch (err) {
        res.push({
          name: row.memberName,
          admissionNo: row.admissionNo,
          status: 'error',
          error: err.response?.data?.message || err.message || 'Failed',
        });
      }
      setProgress(i + 1);
    }
    setResults(res);
    setStage('done');
    onDone(); // refresh member list
  };

  const succeeded = results.filter(r => r.status === 'ok').length;
  const failed    = results.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={stage === 'idle' ? onClose : undefined}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} />
            <div>
              <p className="font-bold text-sm">Import Members from CSV</p>
              <p className="text-xs opacity-60">Matches: admissionNo, memberName, phone, email, bloodGroup, gender, joiningDate, address, membership, balance</p>
            </div>
          </div>
          {stage !== 'importing' && (
            <button onClick={onClose}><X size={16} className="opacity-60 hover:opacity-100" /></button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Stage: idle ── */}
          {stage === 'idle' && (
            <div className="flex flex-col items-center justify-center py-10">
              <label className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition">
                  <Upload size={28} className="text-slate-400" />
                </div>
                <p className="font-semibold text-slate-700">Click to select CSV file</p>
                <p className="text-xs text-slate-400">Expected columns: admissionNo, memberName, phone, email, bloodGroup, gender, joiningDate, status, balance, address, city, state, country, pincode, membership</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
          )}

          {/* ── Stage: preview ── */}
          {stage === 'preview' && (
            <>
              <p className="text-sm font-semibold text-slate-700 mb-3">
                {rows.length} members found — review before importing
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {['ID','Name','Phone','Package','Start','End Date','Balance'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((row, i) => {
                      const dur     = parseDurationDays(row.membership);
                      const start   = row.joiningDate || '—';
                      const end     = start !== '—' ? addDays(start, dur) : '—';
                      const balance = parseFloat(row.balance) || 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-blue-600">{row.admissionNo}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{row.memberName}</td>
                          <td className="px-3 py-2 text-slate-500">{row.phone}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.membership || '—'}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{start}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{end}</td>
                          <td className="px-3 py-2">
                            {balance > 0
                              ? <span className="text-red-600 font-bold">₹{balance}</span>
                              : <span className="text-emerald-600 font-semibold">Paid</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Each member will be registered + a payment record created (balance linked from CSV).
              </p>
            </>
          )}

          {/* ── Stage: importing ── */}
          {stage === 'importing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 size={36} className="animate-spin text-red-600" />
              <p className="font-semibold text-slate-700">Importing… {progress} / {rows.length}</p>
              <div className="w-full bg-slate-100 rounded-full h-2 max-w-xs">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress / rows.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">Please do not close this window</p>
            </div>
          )}

          {/* ── Stage: done ── */}
          {stage === 'done' && (
            <>
              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{succeeded}</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">Imported</p>
                </div>
                <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-red-600">{failed}</p>
                  <p className="text-xs text-red-700 font-semibold mt-0.5">Failed</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {['ID','Name','Result'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {results.map((r, i) => (
                      <tr key={i} className={r.status === 'ok' ? '' : 'bg-red-50/60'}>
                        <td className="px-3 py-2 font-mono text-blue-600 text-[10px]">{r.admissionNo}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{r.name}</td>
                        <td className="px-3 py-2">
                          {r.status === 'ok'
                            ? <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle size={11}/> Success</span>
                            : <span className="text-red-600 font-semibold" title={r.error}>Failed: {r.error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2 flex-shrink-0 border-t border-slate-100 pt-4">
          {stage === 'idle' && (
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
              Cancel
            </button>
          )}
          {stage === 'preview' && (
            <>
              <button onClick={() => setStage('idle')}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
                Back
              </button>
              <button onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">
                <Upload size={14} /> Import {rows.length} Members
              </button>
            </>
          )}
          {stage === 'done' && (
            <button onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Member status helpers ─────────────────────────────────────────────────────

const getMembershipStatus = (endDate) => {
  if (!endDate) return { label: 'Unknown', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', icon: AlertCircle };
  const diffDays = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { label: 'Expired',             color: 'bg-red-100 text-red-700',     dot: 'bg-red-500',     icon: XCircle };
  if (diffDays <= 7) return { label: `Expires in ${diffDays}d`, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', icon: Clock };
  return                    { label: 'Active',               color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle };
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

const MemberCard = ({ member, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const status = getMembershipStatus(member.endDate);
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all duration-200 group">
      <div className="relative flex-shrink-0 cursor-pointer" onClick={() => navigate(`/members/${member._id}`)}>
        <Avatar src={member.images?.profileImage} name={member.name} />
        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${status.dot}`} />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/members/${member._id}`)}>
        <p className="font-semibold text-slate-900 truncate group-hover:text-red-600 transition-colors">{member.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-500">{member.age} yrs</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500">{member.gender}</span>
          {member.packages && <><span className="text-slate-300">·</span><span className="text-xs text-slate-500 truncate">{member.packages}</span></>}
          {member.attendanceId && <><span className="text-slate-300">·</span><span className="text-xs text-blue-500 font-mono">ID:{member.attendanceId}</span></>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
          <StatusIcon size={10} />{status.label}
        </span>
        <button onClick={() => navigate(`/members/${member._id}`)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition opacity-0 group-hover:opacity-100" title="View profile">
          <Eye size={14} />
        </button>
        <button onClick={e => { e.stopPropagation(); onEdit(member); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition opacity-0 group-hover:opacity-100" title="Edit member">
          <Edit3 size={14} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(member); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition opacity-0 group-hover:opacity-100" title="Delete member">
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
  const [members,      setMembers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page,         setPage]         = useState(1);
  const [showImport,   setShowImport]   = useState(false);

  useEffect(() => { fetchMembers(); }, []);
  useEffect(() => { setPage(1); }, [filter, search]);

  const fetchMembers = async () => {
    try {
      const res = await CustomBaseUrl.get(`/fetch`);
      setMembers(res.data.data || []);
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
    const diff = Math.ceil((new Date(m.endDate) - new Date()) / 86400000);
    if (diff < 0)  return 'expired';
    if (diff <= 7) return 'expiring';
    return 'active';
  };

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.emails?.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || getStatus(m) === filter;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const counts = {
    all:      members.length,
    active:   members.filter(m => getStatus(m) === 'active').length,
    expiring: members.filter(m => getStatus(m) === 'expiring').length,
    expired:  members.filter(m => getStatus(m) === 'expired').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Members</h1>
            <p className="text-slate-500 text-sm mt-0.5">{members.length} total registered</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-sm font-semibold shadow-sm">
              <Upload size={15} /> Import CSV
            </button>
            <button onClick={() => navigate('/register')}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 active:scale-95 transition-all text-sm font-semibold shadow-sm">
              <Plus size={16} /> Add Member
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone or email…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 text-sm shadow-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { key:'all',      label:'All',      color:'text-slate-700'  },
            { key:'active',   label:'Active',   color:'text-emerald-600'},
            { key:'expiring', label:'Expiring', color:'text-amber-600'  },
            { key:'expired',  label:'Expired',  color:'text-red-600'    },
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
                <MemberCard key={member._id} member={member} onEdit={handleEdit} onDelete={setDeleteTarget} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} filtered={filtered.length} onPage={setPage} />
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal member={deleteTarget} onConfirm={handleDeleteConfirm} onClose={() => setDeleteTarget(null)} />
      )}

      {showImport && (
        <CSVImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { fetchMembers(); setShowImport(false); }}
        />
      )}
    </div>
  );
};

export default Members;

