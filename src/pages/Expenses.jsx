import React, { useState, useEffect, useRef, useCallback } from 'react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import {
  Plus, Tag, Trash2, Pencil, X, ChevronLeft, ChevronRight,
  Receipt, Search, TrendingDown, TrendingUp, Wallet, Calendar,
  BarChart2, Upload, Eye, RefreshCw, IndianRupee, Layers,
  ArrowUpCircle, ArrowDownCircle, Scale, SlidersHorizontal
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────
const rupee   = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const PERIODS = [
  { key: 'week',    label: 'Week'    },
  { key: 'month',   label: 'Month'   },
  { key: 'quarter', label: 'Quarter' },
  { key: 'half',    label: '6 Mo'    },
  { key: 'year',    label: 'Year'    },
  { key: 'all',     label: 'All'     },
  { key: 'custom',  label: 'Custom'  },
];
const PERIOD_FULL = {
  week: 'This Week', month: 'This Month', quarter: 'This Quarter',
  half: '6 Months', year: 'This Year', all: 'All Time', custom: 'Custom',
};

function periodRange(key, s, e) {
  if (key === 'custom') {
    return {
      start: s ? new Date(s + 'T00:00:00') : new Date(2000, 0, 1),
      end:   e ? new Date(e + 'T23:59:59') : new Date(),
    };
  }
  const end = new Date(), start = new Date();
  if      (key === 'week')    start.setDate(start.getDate() - 7);
  else if (key === 'month')   { start.setMonth(start.getMonth() - 1); start.setDate(1); }
  else if (key === 'quarter') { start.setMonth(start.getMonth() - 3); start.setDate(1); }
  else if (key === 'half')    { start.setMonth(start.getMonth() - 6); start.setDate(1); }
  else if (key === 'year')    { start.setFullYear(start.getFullYear() - 1); start.setDate(1); }
  else                          start.setFullYear(2000);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function inRange(dateStr, { start, end }) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

const PAYMENT_LABELS = { cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank Transfer', cheque: 'Cheque', other: 'Other' };
const PAYMENT_COLORS = { cash: 'bg-green-100 text-green-700', upi: 'bg-blue-100 text-blue-700', card: 'bg-purple-100 text-purple-700', bank_transfer: 'bg-orange-100 text-orange-700', cheque: 'bg-yellow-100 text-yellow-700', other: 'bg-slate-100 text-slate-600' };
const PER_PAGE = 15;

// ── Chart.js loader ───────────────────────────────────────────────────────────
let chartLoaded = false;
async function ensureChart() {
  if (chartLoaded || window.Chart) { chartLoaded = true; return; }
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  chartLoaded = true;
}

// ── Unified Chart (expense or income) ────────────────────────────────────────
function MiniChart({ data, categories, mode }) {
  // mode: 'expense' | 'income'
  const canvasRef  = useRef(null);
  const chartRef   = useRef(null);
  const [type, setType]       = useState('bar');
  const [period, setPeriod]   = useState('month');

  useEffect(() => {
    let cancelled = false;
    ensureChart().then(() => {
      if (cancelled || !canvasRef.current || !window.Chart) return;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

      const range    = periodRange(period);
      const filtered = data.filter(e => inRange(e.date, range));
      const now      = new Date();
      const numB     = period === 'week' ? 7 : period === 'month' ? 4 : period === 'quarter' ? 3 : period === 'half' ? 6 : 12;

      let labels, datasets;

      if (type === 'bar') {
        const buckets = [];
        for (let i = numB - 1; i >= 0; i--) {
          if (period === 'week') {
            const d = new Date(now); d.setDate(d.getDate() - i);
            buckets.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), start: new Date(new Date(d).setHours(0,0,0,0)), end: new Date(new Date(d).setHours(23,59,59,999)) });
          } else {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({ label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), start: d, end: new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59) });
          }
        }
        labels = buckets.map(b => b.label);
        if (mode === 'income') {
          datasets = [
            { label: 'Income', data: buckets.map(b => filtered.filter(e => e.type !== 'loss' && new Date(e.date) >= b.start && new Date(e.date) <= b.end).reduce((s, e) => s + e.amount, 0)), backgroundColor: '#10b981', borderRadius: 4 },
            { label: 'Loss',   data: buckets.map(b => filtered.filter(e => e.type === 'loss' && new Date(e.date) >= b.start && new Date(e.date) <= b.end).reduce((s, e) => s + e.amount, 0)),  backgroundColor: '#ef4444', borderRadius: 4 },
          ];
        } else {
          const cats    = [...new Set(filtered.map(e => e.category?.name || 'Other'))].slice(0, 5);
          const palette = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6'];
          datasets = cats.map((cat, ci) => ({
            label: cat,
            data: buckets.map(b => filtered.filter(e => (e.category?.name || 'Other') === cat && new Date(e.date) >= b.start && new Date(e.date) <= b.end).reduce((s, e) => s + e.amount, 0)),
            backgroundColor: palette[ci % palette.length], borderRadius: 4,
          }));
        }
      } else {
        const byKey = {};
        filtered.forEach(e => { const k = e.category?.name || 'Uncategorised'; byKey[k] = (byKey[k] || 0) + e.amount; });
        labels = Object.keys(byKey);
        const pal = mode === 'income'
          ? ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1']
          : ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];
        datasets = [{ data: Object.values(byKey), backgroundColor: labels.map((_, i) => pal[i % pal.length]), borderWidth: 2, borderColor: '#fff' }];
      }

      chartRef.current = new window.Chart(canvasRef.current, {
        type,
        data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: type === 'doughnut' ? 'right' : 'top', labels: { font: { size: 10 }, padding: 10, usePointStyle: true } },
            tooltip: { callbacks: { label: ctx => ` ₹${Number(ctx.raw || 0).toLocaleString('en-IN')}` } },
          },
          ...(type === 'doughnut' ? {} : {
            scales: {
              x: { stacked: mode !== 'income', grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
              y: { stacked: mode !== 'income', beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => v >= 1000 ? '₹' + (v / 1000).toFixed(0) + 'k' : '₹' + v } },
            },
          }),
        },
      });
    });
    return () => { cancelled = true; };
  }, [data, categories, type, period, mode]);

  const accent = mode === 'income' ? 'text-emerald-600' : 'text-indigo-600';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 size={15} className={accent} />
          <span className="text-xs font-bold text-slate-700">{mode === 'income' ? 'Income vs Loss' : 'Expenses by Category'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {['bar', 'doughnut'].map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition ${type === t ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                {t === 'bar' ? 'Bar' : 'Donut'}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {PERIODS.slice(0, 5).map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${period === p.key ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ height: 220 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

// ── Category Colors ───────────────────────────────────────────────────────────
const CAT_COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16'];

// ── Category Modal ────────────────────────────────────────────────────────────
function CategoryModal({ onClose, onSaved, existing, apiBase }) {
  const [name, setName]     = useState(existing?.name || '');
  const [desc, setDesc]     = useState(existing?.description || '');
  const [color, setColor]   = useState(existing?.color || '#6366f1');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('Name required');
    setSaving(true);
    try {
      existing
        ? await CustomBaseUrl.put(`${apiBase}/${existing._id}`, { name, description: desc, color })
        : await CustomBaseUrl.post(apiBase, { name, description: desc, color });
      toast.success(existing ? 'Category updated' : 'Category created');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800">{existing ? 'Edit' : 'New'} Category</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name *"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <div className="flex flex-wrap gap-2">
            {CAT_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-1 ring-slate-500 scale-110' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-6 h-6 rounded-full cursor-pointer border-0 p-0" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? '…' : existing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Category Panel ────────────────────────────────────────────────────────────
function CategoryPanel({ categories, onRefresh, onClose, apiBase, title }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState(null);

  const del = async cat => {
    try { await CustomBaseUrl.delete(`${apiBase}/${cat._id}`); toast.success('Removed'); onRefresh(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2"><Layers size={16} className="text-indigo-600"/><span className="font-bold text-slate-800">{title}</span></div>
            <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600"/></button>
          </div>
          <div className="overflow-y-auto flex-1 space-y-1.5 mb-3">
            {categories.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">No categories yet.</p>}
            {categories.map(cat => (
              <div key={cat._id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{cat.name}</div>
                    {cat.description && <div className="text-xs text-slate-400">{cat.description}</div>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={13}/></button>
                  <button onClick={() => del(cat)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center justify-center gap-1.5">
            <Plus size={15}/> Add Category
          </button>
        </div>
      </div>
      {showCreate && <CategoryModal apiBase={apiBase} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); onRefresh(); }} />}
      {editing && <CategoryModal apiBase={apiBase} existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onRefresh(); }} />}
    </>
  );
}

// ── Expense Modal ─────────────────────────────────────────────────────────────
function ExpenseModal({ onClose, onSaved, existing, categories }) {
  const [title, setTitle]   = useState(existing?.title || '');
  const [desc, setDesc]     = useState(existing?.description || '');
  const [amount, setAmount] = useState(existing?.amount || '');
  const [catId, setCatId]   = useState(existing?.category?._id || existing?.category || '');
  const [method, setMethod] = useState(existing?.paymentMethod || 'cash');
  const [date, setDate]     = useState(existing?.date ? new Date(existing.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState(existing?.vendor || '');
  const [notes, setNotes]   = useState(existing?.notes || '');
  const [receipt, setReceipt]     = useState(null);
  const [previewUrl, setPreviewUrl] = useState(existing?.receiptUrl || '');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const save = async () => {
    if (!title.trim()) return toast.error('Title required');
    if (!amount || Number(amount) <= 0) return toast.error('Valid amount required');
    if (!catId) return toast.error('Select a category');
    setSaving(true);
    try {
      const fd = new FormData();
      [['title',title],['description',desc],['amount',amount],['category',catId],
       ['paymentMethod',method],['date',date],['vendor',vendor],['notes',notes]].forEach(([k,v]) => fd.append(k,v));
      if (receipt) fd.append('receipt', receipt);
      existing
        ? await CustomBaseUrl.put(`/expenses/${existing._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await CustomBaseUrl.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(existing ? 'Expense updated' : 'Expense added');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 my-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800">{existing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400"/></button>
        </div>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount *"
                className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <select value={catId} onChange={e => setCatId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
            <option value="">Select category *</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setMethod(k)}
                className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-medium border transition ${method === k ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Vendor (optional)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-indigo-400 transition min-h-[70px]">
            {previewUrl ? <img src={previewUrl} alt="receipt" className="max-h-20 object-contain rounded-lg" />
              : <><Upload size={18} className="text-slate-400" /><span className="text-xs text-slate-400">Upload receipt (optional)</span></>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setReceipt(f); setPreviewUrl(URL.createObjectURL(f)); } }} />
          </div>
          {previewUrl && <button onClick={() => { setPreviewUrl(''); setReceipt(null); }} className="text-xs text-red-500 hover:underline">Remove receipt</button>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Income Modal ──────────────────────────────────────────────────────────────
function IncomeModal({ onClose, onSaved, existing, categories }) {
  const [title, setTitle]   = useState(existing?.title || '');
  const [desc, setDesc]     = useState(existing?.description || '');
  const [amount, setAmount] = useState(existing?.amount || '');
  const [catId, setCatId]   = useState(existing?.category?._id || existing?.category || '');
  const [method, setMethod] = useState(existing?.paymentMethod || 'cash');
  const [type, setType]     = useState(existing?.type || 'income');
  const [date, setDate]     = useState(existing?.date ? new Date(existing.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [notes, setNotes]   = useState(existing?.notes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return toast.error('Title required');
    if (!amount || Number(amount) <= 0) return toast.error('Valid amount required');
    if (!catId) return toast.error('Select a category');
    setSaving(true);
    try {
      const body = { title, description: desc, amount: Number(amount), category: catId, paymentMethod: method, type, date, notes };
      existing
        ? await CustomBaseUrl.put(`/incomes/${existing._id}`, body)
        : await CustomBaseUrl.post('/incomes', body);
      toast.success(existing ? 'Income updated' : 'Income added');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 my-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800">{existing ? 'Edit Income' : 'Add Income'}</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400"/></button>
        </div>
        <div className="space-y-3">
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            <button onClick={() => setType('income')}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${type === 'income' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-emerald-50'}`}>
              <ArrowUpCircle size={13}/> Income / Gain
            </button>
            <button onClick={() => setType('loss')}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${type === 'loss' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-red-50'}`}>
              <ArrowDownCircle size={13}/> Loss
            </button>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount *"
                className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <select value={catId} onChange={e => setCatId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
            <option value="">Select category *</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setMethod(k)}
                className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-medium border transition ${method === k ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:border-emerald-300'}`}>
                {v}
              </button>
            ))}
          </div>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Update' : 'Add Income'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ item, apiPath, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const confirm = async () => {
    setDeleting(true);
    try { await CustomBaseUrl.delete(`${apiPath}/${item._id}`); toast.success('Deleted'); onDeleted(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setDeleting(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center"><Trash2 size={16} className="text-red-600"/></div>
          <div>
            <div className="font-bold text-slate-800 text-sm">Delete</div>
            <div className="text-xs text-slate-500 truncate max-w-[200px]">"{item.title}"</div>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4">This action cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={confirm} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptViewer({ url, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white"><X size={22}/></button>
        <img src={url} alt="Receipt" className="w-full rounded-2xl shadow-2xl object-contain max-h-[85vh]" />
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, setPage, total, perPage }) {
  if (totalPages <= 1) return null;
  const nums = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) nums.push(i); }
  else {
    nums.push(1);
    if (page > 3) nums.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i);
    if (page < totalPages - 2) nums.push('…');
    nums.push(totalPages);
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-400">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={13}/></button>
        {nums.map((n, i) => n === '…'
          ? <span key={`d${i}`} className="px-1 text-slate-400 text-xs">…</span>
          : <button key={n} onClick={() => setPage(n)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition ${page === n ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{n}</button>
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={13}/></button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Expenses() {
  const [activeTab, setActiveTab] = useState('expenses');

  // shared period (balance card + both tabs stay in sync)
  const [period,    setPeriod]    = useState('week');
  const [custStart, setCustStart] = useState('');
  const [custEnd,   setCustEnd]   = useState('');

  // expenses
  const [expenses, setExpenses]   = useState([]);
  const [expCats, setExpCats]     = useState([]);
  const [expLoading, setExpLoading] = useState(true);
  const [expSearch, setExpSearch]   = useState('');
  const [expCatFilter, setExpCatFilter]       = useState('');
  const [expMethodFilter, setExpMethodFilter] = useState('');
  const [expPage, setExpPage]     = useState(1);
  const [showExpCats, setShowExpCats]   = useState(false);
  const [showAddExp, setShowAddExp]     = useState(false);
  const [editExp, setEditExp]           = useState(null);
  const [delExp, setDelExp]             = useState(null);
  const [viewReceipt, setViewReceipt]   = useState(null);
  const [showExpFilters, setShowExpFilters] = useState(false);

  // income
  const [incomes, setIncomes]     = useState([]);
  const [incCats, setIncCats]     = useState([]);
  const [incLoading, setIncLoading] = useState(true);
  const [incSearch, setIncSearch]   = useState('');
  const [incCatFilter, setIncCatFilter]   = useState('');
  const [incTypeFilter, setIncTypeFilter] = useState('');
  const [incPage, setIncPage]     = useState(1);
  const [showIncCats, setShowIncCats]   = useState(false);
  const [showAddInc, setShowAddInc]     = useState(false);
  const [editInc, setEditInc]           = useState(null);
  const [delInc, setDelInc]             = useState(null);
  const [showIncFilters, setShowIncFilters] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setExpLoading(true);
    try {
      const [a, b] = await Promise.allSettled([CustomBaseUrl.get('/expenses'), CustomBaseUrl.get('/expense-categories')]);
      if (a.status === 'fulfilled') setExpenses(a.value.data?.data || []);
      if (b.status === 'fulfilled') setExpCats(b.value.data?.data || []);
    } catch { toast.error('Failed to load expenses'); }
    finally { setExpLoading(false); }
  }, []);

  const fetchIncomes = useCallback(async () => {
    setIncLoading(true);
    try {
      const [a, b] = await Promise.allSettled([CustomBaseUrl.get('/incomes'), CustomBaseUrl.get('/income-categories')]);
      if (a.status === 'fulfilled') setIncomes(a.value.data?.data || []);
      if (b.status === 'fulfilled') setIncCats(b.value.data?.data || []);
    } catch { toast.error('Failed to load incomes'); }
    finally { setIncLoading(false); }
  }, []);

  useEffect(() => { fetchExpenses(); fetchIncomes(); }, [fetchExpenses, fetchIncomes]);

  // ── shared range ──────────────────────────────────────────────────────────
  const range = periodRange(period, custStart, custEnd);

  const periodLabel = period === 'custom'
    ? (custStart && custEnd ? `${custStart} → ${custEnd}` : 'Custom')
    : PERIOD_FULL[period];

  // ── expense metrics ───────────────────────────────────────────────────────
  const filteredExp = expenses.filter(e => {
    if (!inRange(e.date, range)) return false;
    if (expCatFilter && (e.category?._id || e.category) !== expCatFilter) return false;
    if (expMethodFilter && e.paymentMethod !== expMethodFilter) return false;
    if (expSearch.trim()) {
      const q = expSearch.toLowerCase();
      if (!e.title?.toLowerCase().includes(q) && !e.description?.toLowerCase().includes(q)
        && !e.vendor?.toLowerCase().includes(q) && !(e.category?.name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const expTotal     = filteredExp.reduce((s, e) => s + e.amount, 0);
  const expByCategory = {};
  filteredExp.forEach(e => {
    const key = e.category?._id || 'none';
    if (!expByCategory[key]) expByCategory[key] = { name: e.category?.name || 'Uncategorised', color: e.category?.color || '#6366f1', total: 0, count: 0 };
    expByCategory[key].total += e.amount; expByCategory[key].count++;
  });
  const expCatList   = Object.values(expByCategory).sort((a, b) => b.total - a.total);
  const expTotalPgs  = Math.ceil(filteredExp.length / PER_PAGE);
  const expRows      = filteredExp.slice((expPage - 1) * PER_PAGE, expPage * PER_PAGE);

  // ── income metrics ────────────────────────────────────────────────────────
  const filteredInc = incomes.filter(e => {
    if (!inRange(e.date, range)) return false;
    if (incCatFilter && (e.category?._id || e.category) !== incCatFilter) return false;
    if (incTypeFilter && e.type !== incTypeFilter) return false;
    if (incSearch.trim()) {
      const q = incSearch.toLowerCase();
      if (!e.title?.toLowerCase().includes(q) && !e.description?.toLowerCase().includes(q)
        && !(e.category?.name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const incGain      = filteredInc.filter(e => e.type !== 'loss').reduce((s, e) => s + e.amount, 0);
  const incLoss      = filteredInc.filter(e => e.type === 'loss').reduce((s, e) => s + e.amount, 0);
  const incNet       = incGain - incLoss;
  const incByCategory = {};
  filteredInc.forEach(e => {
    const key = e.category?._id || 'none';
    if (!incByCategory[key]) incByCategory[key] = { name: e.category?.name || 'Uncategorised', color: e.category?.color || '#10b981', total: 0, count: 0 };
    incByCategory[key].total += e.amount; incByCategory[key].count++;
  });
  const incCatList   = Object.values(incByCategory).sort((a, b) => b.total - a.total);
  const incTotalPgs  = Math.ceil(filteredInc.length / PER_PAGE);
  const incRows      = filteredInc.slice((incPage - 1) * PER_PAGE, incPage * PER_PAGE);

  // ── balance ───────────────────────────────────────────────────────────────
  const cmpExp       = expenses.filter(e => inRange(e.date, range));
  const cmpInc       = incomes.filter(e => inRange(e.date, range));
  const cmpExpTotal  = cmpExp.reduce((s, e) => s + e.amount, 0);
  const cmpIncGain   = cmpInc.filter(e => e.type !== 'loss').reduce((s, e) => s + e.amount, 0);
  const cmpIncLoss   = cmpInc.filter(e => e.type === 'loss').reduce((s, e) => s + e.amount, 0);
  const cmpNetInc    = cmpIncGain - cmpIncLoss;
  const balance      = cmpNetInc - cmpExpTotal;
  const surplus      = balance >= 0;
  const usedPct      = cmpNetInc > 0 ? Math.min(100, (cmpExpTotal / cmpNetInc) * 100) : 100;

  const changePeriod = k => { setPeriod(k); setExpPage(1); setIncPage(1); };
  const changeCustStart = v => { setCustStart(v); setExpPage(1); setIncPage(1); };
  const changeCustEnd   = v => { setCustEnd(v);   setExpPage(1); setIncPage(1); };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">

        {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
            <button onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-[10px] text-sm font-semibold transition-all ${activeTab === 'expenses' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <TrendingDown size={15}/> Expenses
            </button>
            <button onClick={() => setActiveTab('income')}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-[10px] text-sm font-semibold transition-all ${activeTab === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <TrendingUp size={15}/> Income
            </button>
          </div>

          {/* Period pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm flex-wrap gap-0.5">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => changePeriod(p.key)}
                  className={`px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-all ${period === p.key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm">
                <Calendar size={12} className="text-slate-400" />
                <input type="date" value={custStart} onChange={e => changeCustStart(e.target.value)}
                  className="text-xs text-slate-700 border-none outline-none bg-transparent cursor-pointer" />
                <span className="text-slate-300 text-xs">→</span>
                <input type="date" value={custEnd} onChange={e => changeCustEnd(e.target.value)}
                  className="text-xs text-slate-700 border-none outline-none bg-transparent cursor-pointer" />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {activeTab === 'expenses' ? (
              <>
                <button onClick={() => setShowExpCats(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition shadow-sm">
                  <Tag size={13}/> Categories
                </button>
                <button onClick={() => setShowAddExp(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm">
                  <Plus size={13}/> Add Expense
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setShowIncCats(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-600 transition shadow-sm">
                  <Tag size={13}/> Categories
                </button>
                <button onClick={() => setShowAddInc(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition shadow-sm">
                  <Plus size={13}/> Add Income
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── BALANCE CARD ─────────────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-4 ${surplus ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Scale size={15} className={surplus ? 'text-emerald-600' : 'text-red-600'}/>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Balance — {periodLabel}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white rounded-xl px-4 py-3 border border-emerald-100">
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5 flex items-center gap-1"><ArrowUpCircle size={11} className="text-emerald-500"/> Income</div>
              <div className="text-lg font-black text-emerald-600">+{rupee(cmpIncGain)}</div>
              <div className="text-[11px] text-slate-400">{cmpInc.filter(e=>e.type!=='loss').length} entries</div>
            </div>
            <div className="bg-white rounded-xl px-4 py-3 border border-orange-100">
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5 flex items-center gap-1"><ArrowDownCircle size={11} className="text-orange-500"/> Inc. Loss</div>
              <div className="text-lg font-black text-orange-600">−{rupee(cmpIncLoss)}</div>
              <div className="text-[11px] text-slate-400">{cmpInc.filter(e=>e.type==='loss').length} entries</div>
            </div>
            <div className="bg-white rounded-xl px-4 py-3 border border-red-100">
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5 flex items-center gap-1"><TrendingDown size={11} className="text-red-500"/> Expenses</div>
              <div className="text-lg font-black text-red-600">−{rupee(cmpExpTotal)}</div>
              <div className="text-[11px] text-slate-400">{cmpExp.length} entries</div>
            </div>
            <div className={`rounded-xl px-4 py-3 ${surplus ? 'bg-emerald-600' : 'bg-red-600'}`}>
              <div className="text-[10px] font-semibold text-white/70 uppercase mb-0.5 flex items-center gap-1"><Wallet size={11}/> Balance</div>
              <div className="text-lg font-black text-white">{surplus ? '+' : '−'}{rupee(Math.abs(balance))}</div>
              <div className="text-[11px] text-white/70">{surplus ? 'Surplus' : 'Deficit'}</div>
            </div>
          </div>
          {/* progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>Expenses {Math.round(usedPct)}% of net income</span>
              <span>{rupee(cmpExpTotal)} / {rupee(cmpNetInc)}</span>
            </div>
            <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${surplus ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${usedPct}%` }}/>
            </div>
          </div>
        </div>

        {/* ════════════════════ EXPENSES TAB ══════════════════════════════════ */}
        {activeTab === 'expenses' && (
          <>
            {/* 3 stat pills */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0"><IndianRupee size={16} className="text-white"/></div>
                <div><div className="text-base font-black text-slate-800">{rupee(expTotal)}</div><div className="text-[11px] text-slate-400">{periodLabel} total · {filteredExp.length} records</div></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0"><Tag size={16} className="text-white"/></div>
                <div><div className="text-base font-black text-slate-800">{expCatList[0]?.name || '—'}</div><div className="text-[11px] text-slate-400">Top category · {expCatList[0] ? rupee(expCatList[0].total) : 'no data'}</div></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0"><Layers size={16} className="text-white"/></div>
                <div><div className="text-base font-black text-slate-800">{expCats.length}</div><div className="text-[11px] text-slate-400">Active categories</div></div>
              </div>
            </div>

            {/* Chart + Category breakdown side by side */}
            {expenses.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <MiniChart data={expenses} categories={expCats} mode="expense" />
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">By Category</div>
                  {expCatList.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-8">No data</p>
                    : <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {expCatList.map(cat => {
                          const pct = expTotal > 0 ? (cat.total / expTotal) * 100 : 0;
                          return (
                            <div key={cat.name}>
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}/>
                                  <span className="font-medium text-slate-700 truncate max-w-[110px]">{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800">{rupee(cat.total)}</span>
                                  <span className="text-slate-400">{Math.round(pct)}%</span>
                                </div>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              </div>
            )}

            {/* Search + Filters toolbar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={expSearch} onChange={e => { setExpSearch(e.target.value); setExpPage(1); }}
                  placeholder="Search title, vendor, category…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <button onClick={() => setShowExpFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${showExpFilters || expCatFilter || expMethodFilter ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                <SlidersHorizontal size={13}/> Filters {(expCatFilter || expMethodFilter) ? '•' : ''}
              </button>
              <button onClick={fetchExpenses} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Refresh"><RefreshCw size={14}/></button>
              {showExpFilters && (
                <>
                  <select value={expCatFilter} onChange={e => { setExpCatFilter(e.target.value); setExpPage(1); }}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700">
                    <option value="">All Categories</option>
                    {expCats.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <select value={expMethodFilter} onChange={e => { setExpMethodFilter(e.target.value); setExpPage(1); }}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700">
                    <option value="">All Methods</option>
                    {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {(expCatFilter || expMethodFilter) && (
                    <button onClick={() => { setExpCatFilter(''); setExpMethodFilter(''); }} className="text-xs text-red-500 hover:underline">Clear</button>
                  )}
                </>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {expLoading
                ? <div className="flex items-center justify-center py-16 text-slate-400"><RefreshCw size={20} className="animate-spin mr-2"/> Loading…</div>
                : expRows.length === 0
                  ? <div className="text-center py-14 text-slate-400"><Receipt size={36} className="mx-auto mb-2 opacity-30"/><p className="text-sm font-medium">No expenses found</p><p className="text-xs mt-0.5">Try a different period or clear filters</p></div>
                  : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                              {['#','Title','Category','Amount','Method','Date','Vendor',''].map((h,i) => (
                                <th key={i} className={`px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide ${i===7?'text-center':'text-left'}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {expRows.map((exp, idx) => (
                              <tr key={exp._id} className="hover:bg-slate-50/70 transition">
                                <td className="px-4 py-2.5 text-xs text-slate-400">{(expPage-1)*PER_PAGE+idx+1}</td>
                                <td className="px-4 py-2.5">
                                  <div className="font-medium text-slate-800 text-sm">{exp.title}</div>
                                  {exp.description && <div className="text-[11px] text-slate-400">{exp.description}</div>}
                                </td>
                                <td className="px-4 py-2.5">
                                  {exp.category
                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: (exp.category.color||'#6366f1')+'18', color: exp.category.color||'#6366f1' }}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: exp.category.color||'#6366f1' }}/>{exp.category.name}
                                      </span>
                                    : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-2.5 font-bold text-red-600 text-sm">−{rupee(exp.amount)}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${PAYMENT_COLORS[exp.paymentMethod]||'bg-slate-100 text-slate-600'}`}>
                                    {PAYMENT_LABELS[exp.paymentMethod]||exp.paymentMethod}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(exp.date)}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-400">{exp.vendor||'—'}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center justify-center gap-0.5">
                                    {exp.receiptUrl && <button onClick={() => setViewReceipt(exp.receiptUrl)} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Eye size={13}/></button>}
                                    <button onClick={() => setEditExp(exp)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Pencil size={13}/></button>
                                    <button onClick={() => setDelExp(exp)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={13}/></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Pagination page={expPage} totalPages={expTotalPgs} setPage={setExpPage} total={filteredExp.length} perPage={PER_PAGE}/>
                    </>
                  )
              }
            </div>
          </>
        )}

        {/* ════════════════════ INCOME TAB ════════════════════════════════════ */}
        {activeTab === 'income' && (
          <>
            {/* 3 stat pills */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0"><ArrowUpCircle size={16} className="text-white"/></div>
                <div><div className="text-base font-black text-emerald-600">+{rupee(incGain)}</div><div className="text-[11px] text-slate-400">{periodLabel} · {filteredInc.filter(e=>e.type!=='loss').length} income</div></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0"><ArrowDownCircle size={16} className="text-white"/></div>
                <div><div className="text-base font-black text-red-600">−{rupee(incLoss)}</div><div className="text-[11px] text-slate-400">{filteredInc.filter(e=>e.type==='loss').length} losses</div></div>
              </div>
              <div className={`rounded-xl border shadow-sm px-4 py-3 flex items-center gap-3 ${incNet>=0?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${incNet>=0?'bg-emerald-600':'bg-red-600'}`}><Wallet size={16} className="text-white"/></div>
                <div><div className={`text-base font-black ${incNet>=0?'text-emerald-700':'text-red-700'}`}>{incNet>=0?'+':'−'}{rupee(Math.abs(incNet))}</div><div className="text-[11px] text-slate-400">Net · Income − Loss</div></div>
              </div>
            </div>

            {/* Chart + Category breakdown */}
            {incomes.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <MiniChart data={incomes} categories={incCats} mode="income" />
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">By Category</div>
                  {incCatList.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-8">No data</p>
                    : <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {incCatList.map(cat => {
                          const total = incGain + incLoss;
                          const pct = total > 0 ? (cat.total / total) * 100 : 0;
                          return (
                            <div key={cat.name}>
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}/>
                                  <span className="font-medium text-slate-700 truncate max-w-[110px]">{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800">{rupee(cat.total)}</span>
                                  <span className="text-slate-400">{Math.round(pct)}%</span>
                                </div>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              </div>
            )}

            {/* Search + Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={incSearch} onChange={e => { setIncSearch(e.target.value); setIncPage(1); }}
                  placeholder="Search title, category…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <button onClick={() => setShowIncFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${showIncFilters || incCatFilter || incTypeFilter ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-300'}`}>
                <SlidersHorizontal size={13}/> Filters {(incCatFilter || incTypeFilter) ? '•' : ''}
              </button>
              <button onClick={fetchIncomes} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"><RefreshCw size={14}/></button>
              {showIncFilters && (
                <>
                  <select value={incCatFilter} onChange={e => { setIncCatFilter(e.target.value); setIncPage(1); }}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-slate-700">
                    <option value="">All Categories</option>
                    {incCats.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <select value={incTypeFilter} onChange={e => { setIncTypeFilter(e.target.value); setIncPage(1); }}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-slate-700">
                    <option value="">All Types</option>
                    <option value="income">Income / Gain</option>
                    <option value="loss">Loss</option>
                  </select>
                  {(incCatFilter || incTypeFilter) && (
                    <button onClick={() => { setIncCatFilter(''); setIncTypeFilter(''); }} className="text-xs text-red-500 hover:underline">Clear</button>
                  )}
                </>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {incLoading
                ? <div className="flex items-center justify-center py-16 text-slate-400"><RefreshCw size={20} className="animate-spin mr-2"/> Loading…</div>
                : incRows.length === 0
                  ? <div className="text-center py-14 text-slate-400"><TrendingUp size={36} className="mx-auto mb-2 opacity-30"/><p className="text-sm font-medium">No income records found</p></div>
                  : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                              {['#','Title','Category','Amount','Type','Method','Date',''].map((h,i) => (
                                <th key={i} className={`px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide ${i===7?'text-center':'text-left'}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {incRows.map((inc, idx) => {
                              const isLoss = inc.type === 'loss';
                              return (
                                <tr key={inc._id} className="hover:bg-slate-50/70 transition">
                                  <td className="px-4 py-2.5 text-xs text-slate-400">{(incPage-1)*PER_PAGE+idx+1}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="font-medium text-slate-800 text-sm">{inc.title}</div>
                                    {inc.description && <div className="text-[11px] text-slate-400">{inc.description}</div>}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {inc.category
                                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: (inc.category.color||'#10b981')+'18', color: inc.category.color||'#10b981' }}>
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: inc.category.color||'#10b981' }}/>{inc.category.name}
                                        </span>
                                      : <span className="text-slate-300 text-xs">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`font-black text-sm ${isLoss ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {isLoss ? '−' : '+'}{rupee(inc.amount)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {isLoss
                                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600"><ArrowDownCircle size={10}/> Loss</span>
                                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-600"><ArrowUpCircle size={10}/> Income</span>}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${PAYMENT_COLORS[inc.paymentMethod]||'bg-slate-100 text-slate-600'}`}>
                                      {PAYMENT_LABELS[inc.paymentMethod]||inc.paymentMethod||'—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(inc.date)}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center justify-center gap-0.5">
                                      <button onClick={() => setEditInc(inc)} className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"><Pencil size={13}/></button>
                                      <button onClick={() => setDelInc(inc)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={13}/></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <Pagination page={incPage} totalPages={incTotalPgs} setPage={setIncPage} total={filteredInc.length} perPage={PER_PAGE}/>
                    </>
                  )
              }
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showExpCats && <CategoryPanel categories={expCats} apiBase="/expense-categories" title="Expense Categories" onClose={() => setShowExpCats(false)} onRefresh={fetchExpenses}/>}
      {(showAddExp || editExp) && <ExpenseModal existing={editExp} categories={expCats} onClose={() => { setShowAddExp(false); setEditExp(null); }} onSaved={() => { setShowAddExp(false); setEditExp(null); fetchExpenses(); }}/>}
      {delExp && <DeleteModal item={delExp} apiPath="/expenses" onClose={() => setDelExp(null)} onDeleted={() => { setDelExp(null); fetchExpenses(); }}/>}
      {viewReceipt && <ReceiptViewer url={viewReceipt} onClose={() => setViewReceipt(null)}/>}

      {showIncCats && <CategoryPanel categories={incCats} apiBase="/income-categories" title="Income Categories" onClose={() => setShowIncCats(false)} onRefresh={fetchIncomes}/>}
      {(showAddInc || editInc) && <IncomeModal existing={editInc} categories={incCats} onClose={() => { setShowAddInc(false); setEditInc(null); }} onSaved={() => { setShowAddInc(false); setEditInc(null); fetchIncomes(); }}/>}
      {delInc && <DeleteModal item={delInc} apiPath="/incomes" onClose={() => setDelInc(null)} onDeleted={() => { setDelInc(null); fetchIncomes(); }}/>}
    </div>
  );
}
