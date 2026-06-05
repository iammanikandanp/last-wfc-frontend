import React, { useState, useEffect } from 'react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, Search, Filter,
  Edit3, Trash2, Check, ChevronDown, UserPlus, Phone,
  Megaphone, TrendingUp, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';

const STATUS_CONFIG = {
  New:        { color: 'bg-blue-100 text-blue-700 border-blue-200',      dot: 'bg-blue-500' },
  Contacted:  { color: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-500' },
  Interested: { color: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  Converted:  { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Lost:       { color: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-500' },
};

const SOURCES  = ['Walk-in', 'Phone', 'Instagram', 'Facebook', 'WhatsApp', 'Referral', 'Google', 'Other'];
const INTERESTS= ['Weight Loss', 'Muscle Gain', 'Fitness', 'Yoga', 'Cardio', 'Personal Training', 'Other'];
const STATUSES = Object.keys(STATUS_CONFIG);
const PER_PAGE = 10;

const LeadModal = ({ lead, onSave, onClose }) => {
  const isEdit = !!lead;
  const [form, setForm] = useState({
    name:         lead?.name         || '',
    phone:        lead?.phone        || '',
    email:        lead?.email        || '',
    age:          lead?.age          || '',
    gender:       lead?.gender       || '',
    interest:     lead?.interest     || '',
    source:       lead?.source       || 'Walk-in',
    message:      lead?.message      || '',
    status:       lead?.status       || 'New',
    followUpDate: lead?.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
    notes:        lead?.notes        || '',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setErr('Name and Phone are required');
      return;
    }
    setSaving(true); setErr('');
    try {
      if (isEdit) {
        await CustomBaseUrl.put(`/leads/${lead._id}`, form);
      } else {
        await CustomBaseUrl.post(`/leads`, form);
      }
      onSave();
      onClose();
    } catch(e) {
      setErr(e.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()} style={{ animation: 'su .2s ease' }}>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <UserPlus size={18} />
            <p className="font-bold text-sm">{isEdit ? 'Edit Lead' : 'New Lead / Enquiry'}</p>
          </div>
          <button onClick={onClose}><X size={16} className="opacity-70 hover:opacity-100" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name<span className="text-red-500 ml-0.5">*</span></label>
              <input
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Name"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Phone<span className="text-red-500 ml-0.5">*</span></label>
              <input
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="10-digit"
                type="tel"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <input
                value={form.email}
                onChange={handleChange('email')}
                placeholder="Email (optional)"
                type="email"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Age</label>
              <input
                value={form.age}
                onChange={handleChange('age')}
                placeholder="Age"
                type="number"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Gender</label>
              <select value={form.gender} onChange={handleChange('gender')} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
                <option value="">Select…</option>
                {["Male","Female","Other"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Source</label>
              <select value={form.source} onChange={handleChange('source')} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
                <option value="">Select…</option>
                {SOURCES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Interest</label>
              <select value={form.interest} onChange={handleChange('interest')} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
                <option value="">Select…</option>
                {INTERESTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
              <select value={form.status} onChange={handleChange('status')} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
                <option value="">Select…</option>
                {STATUSES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Follow-up Date</label>
            <input value={form.followUpDate} onChange={handleChange('followUpDate')} type="date"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Message / Query</label>
            <textarea value={form.message} onChange={handleChange('message')}
              placeholder="What is the member asking about?" rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Internal Notes</label>
            <textarea value={form.notes} onChange={handleChange('notes')}
              placeholder="Staff notes…" rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</p>}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40">
            {saving ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : <><Check size={14} />{isEdit ? 'Update' : 'Add Lead'}</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes su{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
};

const StatusBadge = ({ lead, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.New;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${cfg.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {lead.status}
        <ChevronDown size={9} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden min-w-[120px]">
          {STATUSES.map(s => (
            <button key={s} onClick={() => { onUpdate(lead._id, { status: s }); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition ${lead.status===s?'font-bold':''}`}>
              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
              {s}
              {lead.status===s && <Check size={10} className="ml-auto text-emerald-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Pagination = ({ page, totalPages, onPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
      <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition">
          <ChevronLeft size={14} className="text-slate-600" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
          .reduce((acc, n, idx, arr) => {
            if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
            acc.push(n);
            return acc;
          }, [])
          .map((n, i) => n === '…'
            ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
            : <button key={n} onClick={() => onPage(n)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${page === n ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {n}
              </button>
          )}
        <button onClick={() => onPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition">
          <ChevronRight size={14} className="text-slate-600" />
        </button>
      </div>
    </div>
  );
};

const Leads = () => {
  const navigate  = useNavigate();
  const [leads,     setLeads]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editLead,  setEditLead]  = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [page,      setPage]      = useState(1);

  useEffect(() => { fetchLeads(); }, []);
  useEffect(() => { setPage(1); }, [filter, search]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await CustomBaseUrl.get(`/leads`);
      setLeads(res.data?.leads || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (id, data) => {
    try {
      await CustomBaseUrl.put(`/leads/${id}`, data);
      setLeads(prev => prev.map(l => l._id === id ? { ...l, ...data } : l));
    } catch { alert('Update failed'); }
  };

  const handleDelete = async () => {
    try {
      await CustomBaseUrl.delete(`/leads/${delTarget._id}`);
      setLeads(prev => prev.filter(l => l._id !== delTarget._id));
      setDelTarget(null);
    } catch { alert('Delete failed'); }
  };

  const filtered = leads
    .filter(l => filter === 'All' || l.status === filter)
    .filter(l => !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search));

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const counts = STATUSES.reduce((acc, s) => { acc[s] = leads.filter(l => l.status === s).length; return acc; }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Megaphone size={20} className="text-blue-600" /> Leads
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Gym enquiries · Track & convert to members</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchLeads} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 shadow-sm">
              <RefreshCw size={14} className={`text-slate-500 ${loading?'animate-spin':''}`} />
            </button>
            <button onClick={() => { setEditLead(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
              <Plus size={14} /> New Lead
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-5">
          {[
            { label:'Total',    val:leads.length,       color:'text-slate-700', bg:'bg-white' },
            { label:'New',      val:counts.New||0,       color:'text-blue-600',  bg:'bg-blue-50' },
            { label:'Contacted',val:counts.Contacted||0, color:'text-amber-600', bg:'bg-amber-50' },
            { label:'Interested',val:counts.Interested||0,color:'text-violet-600',bg:'bg-violet-50'},
            { label:'Converted',val:counts.Converted||0, color:'text-emerald-600',bg:'bg-emerald-50'},
            { label:'Lost',     val:counts.Lost||0,      color:'text-red-500',   bg:'bg-red-50' },
          ].map(({ label, val, color, bg }) => (
            <div key={label} onClick={() => setFilter(label === 'Total' ? 'All' : label)}
              className={`${bg} rounded-xl border border-slate-100 shadow-sm p-3 text-center cursor-pointer hover:shadow-md transition`}>
              <p className={`text-xl font-black ${color}`}>{val}</p>
              <p className="text-[10px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {['All', ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === s ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>{s}</button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name / phone…"
              className="pl-7 pr-7 py-1.5 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-300 w-44 shadow-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={11} className="text-slate-400" /></button>}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <RefreshCw size={24} className="animate-spin text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading leads…</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">{filter === 'All' ? 'All Leads' : filter} · {filtered.length} records</p>
              <p className="text-xs text-slate-400">Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</p>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-14 text-slate-400">
                <Megaphone size={32} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No leads yet</p>
                <p className="text-xs mt-1">Click "New Lead" to add your first enquiry</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['#','Name','Phone','Interest','Source','Status','Follow-up','Actions'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginated.map((l, i) => (
                      <tr key={l._id} className="hover:bg-slate-50 transition group">
                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[10px]">{(page-1)*PER_PAGE + i + 1}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-800 whitespace-nowrap">{l.name}</p>
                          {l.email && <p className="text-[10px] text-slate-400">{l.email}</p>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">{l.phone}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{l.interest || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium whitespace-nowrap">{l.source}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge lead={l} onUpdate={handleUpdate} />
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                          {l.followUpDate ? new Date(l.followUpDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {l.phone && (
                              <a href={`tel:${l.phone}`}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="Call">
                                <Phone size={12} />
                              </a>
                            )}
                            <button onClick={() => { setEditLead(l); setShowModal(true); }}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition" title="Edit">
                              <Edit3 size={12} />
                            </button>
                            {(l.status === 'Interested' || l.status === 'Converted') ? (
                              <button onClick={() => navigate('/register')}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition" title="Convert to Member">
                                <UserPlus size={12} />
                              </button>
                            ) : null}
                            <button onClick={() => setDelTarget(l)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </div>
        )}
      </div>

      {showModal && (
        <LeadModal lead={editLead} onSave={fetchLeads} onClose={() => { setShowModal(false); setEditLead(null); }} />
      )}

      {delTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDelTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600" /></div>
            <h3 className="font-bold text-slate-900 mb-1">Delete Lead?</h3>
            <p className="text-slate-500 text-sm mb-5"><strong>{delTarget.name}</strong> · {delTarget.phone}</p>
            <div className="flex gap-3">
              <button onClick={() => setDelTarget(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
