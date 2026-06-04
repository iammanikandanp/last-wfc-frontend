import React, { useState, useEffect, useRef, useCallback } from 'react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import {
  Plus, Tag, Trash2, Pencil, X, ChevronLeft, ChevronRight,
  Receipt, Search, Filter, TrendingDown, Wallet, Calendar,
  BarChart2, Upload, Eye, RefreshCw, IndianRupee, Layers
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────
const rupee = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const PERIODS = [
  { key: 'week',    label: 'This Week' },
  { key: 'month',   label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'half',    label: '6 Months' },
  { key: 'year',    label: 'This Year' },
  { key: 'all',     label: 'All Time' },
];

function periodRange(key) {
  const end = new Date();
  const start = new Date();
  if (key === 'week')    { start.setDate(start.getDate() - 7); }
  else if (key === 'month')   { start.setMonth(start.getMonth() - 1); start.setDate(1); }
  else if (key === 'quarter') { start.setMonth(start.getMonth() - 3); start.setDate(1); }
  else if (key === 'half')    { start.setMonth(start.getMonth() - 6); start.setDate(1); }
  else if (key === 'year')    { start.setFullYear(start.getFullYear() - 1); start.setDate(1); }
  else { start.setFullYear(2000); }
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

// ── Chart.js CDN loader ───────────────────────────────────────────────────────
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

// ── Mini Chart component ──────────────────────────────────────────────────────
function ExpenseChart({ expenses, categories }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'doughnut'
  const [chartPeriod, setChartPeriod] = useState('month');

  useEffect(() => {
    let cancelled = false;
    ensureChart().then(() => {
      if (cancelled || !canvasRef.current || !window.Chart) return;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

      const range = periodRange(chartPeriod);
      const filtered = expenses.filter(e => inRange(e.date, range));

      let labels, datasets;
      const catColors = {};
      categories.forEach(c => { catColors[c._id] = c.color || '#6366f1'; });

      if (chartType === 'bar') {
        // Group by week buckets (last 8 weeks) or monthly
        const numBuckets = chartPeriod === 'week' ? 7 : chartPeriod === 'month' ? 4 : chartPeriod === 'quarter' ? 3 : chartPeriod === 'half' ? 6 : 12;
        const buckets = [];
        const now = new Date();
        for (let i = numBuckets - 1; i >= 0; i--) {
          if (chartPeriod === 'week') {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            buckets.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), start: new Date(d.setHours(0,0,0,0)), end: new Date(new Date(d).setHours(23,59,59,999)) });
          } else {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            buckets.push({ label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), start: d, end });
          }
        }
        labels = buckets.map(b => b.label);
        const catNames = [...new Set(filtered.map(e => e.category?.name || 'Other'))].slice(0, 5);
        const palette = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6'];
        datasets = catNames.map((cat, ci) => ({
          label: cat,
          data: buckets.map(b => filtered.filter(e => (e.category?.name || 'Other') === cat && new Date(e.date) >= b.start && new Date(e.date) <= b.end).reduce((s, e) => s + e.amount, 0)),
          backgroundColor: palette[ci % palette.length],
          borderRadius: 4,
        }));
      } else {
        // Doughnut by category
        const byCategory = {};
        filtered.forEach(e => {
          const key = e.category?.name || 'Uncategorised';
          byCategory[key] = (byCategory[key] || 0) + e.amount;
        });
        labels = Object.keys(byCategory);
        const palette = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];
        datasets = [{
          data: Object.values(byCategory),
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderWidth: 2,
          borderColor: '#fff',
        }];
      }

      const isDoughnut = chartType === 'doughnut';
      chartRef.current = new window.Chart(canvasRef.current, {
        type: chartType,
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: isDoughnut ? 'right' : 'top',
              labels: { font: { size: 11 }, padding: 12, usePointStyle: true },
            },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const val = ctx.raw || 0;
                  return ` ₹${Number(val).toLocaleString('en-IN')}`;
                },
              },
            },
          },
          ...(isDoughnut ? {} : {
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
              y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: v => v >= 1000 ? '₹' + (v/1000).toFixed(0)+'k' : '₹'+v } },
            },
          }),
        },
      });
    });
    return () => { cancelled = true; };
  }, [expenses, categories, chartType, chartPeriod]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-700">Expense Comparison</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {['bar','doughnut'].map(t => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${chartType === t ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'bar' ? 'Bar' : 'Donut'}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {PERIODS.slice(0, 5).map(p => (
              <button key={p.key} onClick={() => setChartPeriod(p.key)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition ${chartPeriod === p.key ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {p.label.replace('This ', '')}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="relative" style={{ height: 260 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ── Category Modal ─────────────────────────────────────────────────────────────
const CAT_COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16'];
const CAT_ICONS  = ['tag','utensils','zap','wrench','truck','shield','book','users','coffee','heart','monitor','phone','home','globe'];

function CategoryModal({ onClose, onSaved, existing }) {
  const [name, setName]   = useState(existing?.name || '');
  const [desc, setDesc]   = useState(existing?.description || '');
  const [color, setColor] = useState(existing?.color || '#6366f1');
  const [icon, setIcon]   = useState(existing?.icon || 'tag');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('Category name is required');
    setSaving(true);
    try {
      if (existing) {
        await CustomBaseUrl.put(`/expense-categories/${existing._id}`, { name, description: desc, color, icon });
        toast.success('Category updated');
      } else {
        await CustomBaseUrl.post('/expense-categories', { name, description: desc, color, icon });
        toast.success('Category created');
      }
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save category');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">{existing ? 'Edit Category' : 'Create Category'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Electricity, Rent, Equipment"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {CAT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} title={c}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-0 p-0" title="Custom color" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Expense Modal ─────────────────────────────────────────────────────
function ExpenseModal({ onClose, onSaved, existing, categories }) {
  const [title, setTitle]   = useState(existing?.title || '');
  const [desc, setDesc]     = useState(existing?.description || '');
  const [amount, setAmount] = useState(existing?.amount || '');
  const [catId, setCatId]   = useState(existing?.category?._id || existing?.category || '');
  const [method, setMethod] = useState(existing?.paymentMethod || 'cash');
  const [date, setDate]     = useState(existing?.date ? new Date(existing.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState(existing?.vendor || '');
  const [notes, setNotes]   = useState(existing?.notes || '');
  const [receipt, setReceipt] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(existing?.receiptUrl || '');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setReceipt(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!title.trim()) return toast.error('Title is required');
    if (!amount || Number(amount) <= 0) return toast.error('Valid amount is required');
    if (!catId) return toast.error('Please select a category');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', desc);
      fd.append('amount', amount);
      fd.append('category', catId);
      fd.append('paymentMethod', method);
      fd.append('date', date);
      fd.append('vendor', vendor);
      fd.append('notes', notes);
      if (receipt) fd.append('receipt', receipt);

      if (existing) {
        await CustomBaseUrl.put(`/expenses/${existing._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Expense updated');
      } else {
        await CustomBaseUrl.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Expense added');
      }
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save expense');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 my-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">{existing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Monthly electricity bill"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Amount (₹) *</label>
              <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Category *</label>
            <select value={catId} onChange={e => setCatId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">Select category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setMethod(k)}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition ${method === k ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Vendor + Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Vendor / Supplier</label>
              <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Optional"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief note"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Receipt / Bill (optional)</label>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-indigo-400 transition min-h-[80px]">
              {previewUrl ? (
                <img src={previewUrl} alt="receipt" className="max-h-24 object-contain rounded-lg" />
              ) : (
                <>
                  <Upload size={20} className="text-slate-400" />
                  <span className="text-xs text-slate-500">Click to upload image (jpg, png, webp)</span>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
            {previewUrl && (
              <button onClick={() => { setPreviewUrl(''); setReceipt(null); }} className="text-xs text-red-500 mt-1 hover:underline">
                Remove receipt
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ expense, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const confirm = async () => {
    setDeleting(true);
    try {
      await CustomBaseUrl.delete(`/expenses/${expense._id}`);
      toast.success('Expense deleted');
      onDeleted();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Delete Expense</h2>
        </div>
        <p className="text-sm text-slate-600 mb-5">
          Are you sure you want to delete <strong>"{expense.title}"</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={confirm} disabled={deleting}
            className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Category Manager Panel ────────────────────────────────────────────────────
function CategoryPanel({ categories, onRefresh, onClose }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const deleteCategory = async (cat) => {
    try {
      await CustomBaseUrl.delete(`/expense-categories/${cat._id}`);
      toast.success('Category removed');
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800">Expense Categories</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 mb-4 pr-1">
            {categories.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">No categories yet. Create one!</p>
            )}
            {categories.map(cat => (
              <div key={cat._id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || '#6366f1' }} />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{cat.name}</div>
                    {cat.description && <div className="text-xs text-slate-500">{cat.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                    <Pencil size={14}/>
                  </button>
                  <button onClick={() => deleteCategory(cat)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowCreate(true)}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2">
            <Plus size={16}/> Add Category
          </button>
        </div>
      </div>

      {showCreate && (
        <CategoryModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); onRefresh(); }} />
      )}
      {editing && (
        <CategoryModal existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onRefresh(); }} />
      )}
    </>
  );
}

// ── Receipt Viewer Modal ──────────────────────────────────────────────────────
function ReceiptViewer({ url, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-slate-300">
          <X size={24}/>
        </button>
        <img src={url} alt="Receipt" className="w-full rounded-2xl shadow-2xl object-contain max-h-[85vh]" />
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Expenses() {
  const [expenses, setExpenses]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);

  const [search, setSearch]           = useState('');
  const [period, setPeriod]           = useState('month');
  const [catFilter, setCatFilter]     = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage]               = useState(1);

  const [showCatPanel, setShowCatPanel] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editExpense, setEditExpense]   = useState(null);
  const [deleteExpense_, setDeleteExpense] = useState(null);
  const [viewReceipt, setViewReceipt]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.allSettled([
        CustomBaseUrl.get('/expenses'),
        CustomBaseUrl.get('/expense-categories'),
      ]);
      if (expRes.status === 'fulfilled') setExpenses(expRes.value.data?.data || []);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data?.data || []);
    } catch (e) {
      toast.error('Failed to load expenses');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const range = periodRange(period);
  const filtered = expenses.filter(e => {
    if (!inRange(e.date, range)) return false;
    if (catFilter && (e.category?._id || e.category) !== catFilter) return false;
    if (methodFilter && e.paymentMethod !== methodFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches = e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.vendor?.toLowerCase().includes(q) || (e.category?.name || '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const total   = filtered.reduce((s, e) => s + e.amount, 0);
  const allTimeTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown for current period
  const byCategory = {};
  filtered.forEach(e => {
    const key = e.category?._id || 'none';
    const name = e.category?.name || 'Uncategorised';
    const color = e.category?.color || '#6366f1';
    if (!byCategory[key]) byCategory[key] = { name, color, total: 0, count: 0 };
    byCategory[key].total += e.amount;
    byCategory[key].count += 1;
  });
  const topCategory = Object.values(byCategory).sort((a,b) => b.total - a.total)[0];

  // Pagination display helper
  const pageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('…');
      for (let i = Math.max(2, page-1); i <= Math.min(totalPages-1, page+1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingDown size={24} className="text-indigo-600" /> Expenses
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Track and manage all gym expenses</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowCatPanel(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition shadow-sm">
              <Tag size={15}/> Categories
            </button>
            <button onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm">
              <Plus size={15}/> Add Expense
            </button>
          </div>
        </div>

        {/* ── Period Selector ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${period === p.key ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'border-slate-200 text-slate-600 bg-white hover:border-indigo-400'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Period Total" value={rupee(total)} icon={IndianRupee} color="bg-indigo-500" sub={`${filtered.length} transactions`} />
          <KpiCard label="All-Time Total" value={rupee(allTimeTotal)} icon={Wallet} color="bg-red-500" sub={`${expenses.length} records`} />
          <KpiCard label="Top Category" value={topCategory?.name || '—'} icon={Tag} color="bg-amber-500" sub={topCategory ? rupee(topCategory.total) : 'No data'} />
          <KpiCard label="Categories" value={categories.length} icon={Layers} color="bg-emerald-500" sub="Active categories" />
        </div>

        {/* ── Chart ──────────────────────────────────────────────────────────── */}
        {expenses.length > 0 && (
          <ExpenseChart expenses={expenses} categories={categories} />
        )}

        {/* ── Category Breakdown Pills ───────────────────────────────────────── */}
        {Object.keys(byCategory).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Category Breakdown — {PERIODS.find(p=>p.key===period)?.label}</h3>
            <div className="flex flex-wrap gap-2">
              {Object.values(byCategory).sort((a,b)=>b.total-a.total).map(cat => (
                <div key={cat.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-100 bg-slate-50">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-medium text-slate-700">{cat.name}</span>
                  <span className="text-xs font-bold text-slate-800">{rupee(cat.total)}</span>
                  <span className="text-xs text-slate-400">({cat.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filters + Search ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by title, vendor, category…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>

          <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700">
            <option value="">All Methods</option>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Refresh">
            <RefreshCw size={16}/>
          </button>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw size={24} className="animate-spin mr-2" /> Loading…
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Receipt size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No expenses found</p>
              <p className="text-sm mt-1">Try changing the period or filters, or add a new expense.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginated.map((exp, idx) => (
                      <tr key={exp._id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-500">{(page-1)*PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{exp.title}</div>
                          {exp.description && <div className="text-xs text-slate-400 mt-0.5">{exp.description}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {exp.category ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: (exp.category.color || '#6366f1') + '20', color: exp.category.color || '#6366f1' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: exp.category.color || '#6366f1' }} />
                              {exp.category.name}
                            </span>
                          ) : <span className="text-slate-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{rupee(exp.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[exp.paymentMethod] || 'bg-slate-100 text-slate-600'}`}>
                            {PAYMENT_LABELS[exp.paymentMethod] || exp.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(exp.date)}</td>
                        <td className="px-4 py-3 text-slate-500">{exp.vendor || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {exp.receiptUrl && (
                              <button onClick={() => setViewReceipt(exp.receiptUrl)} title="View Receipt"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                <Eye size={14}/>
                              </button>
                            )}
                            <button onClick={() => setEditExpense(exp)} title="Edit"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                              <Pencil size={14}/>
                            </button>
                            <button onClick={() => setDeleteExpense(exp)} title="Delete"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ─────────────────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronLeft size={14}/>
                    </button>
                    {pageNumbers().map((n, i) => (
                      n === '…'
                        ? <span key={`d${i}`} className="px-1 text-slate-400 text-sm">…</span>
                        : <button key={n} onClick={() => setPage(n)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium transition ${page === n ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                            {n}
                          </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronRight size={14}/>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showCatPanel && (
        <CategoryPanel categories={categories} onClose={() => setShowCatPanel(false)} onRefresh={() => { fetchAll(); }} />
      )}
      {(showAddExpense || editExpense) && (
        <ExpenseModal
          existing={editExpense}
          categories={categories}
          onClose={() => { setShowAddExpense(false); setEditExpense(null); }}
          onSaved={() => { setShowAddExpense(false); setEditExpense(null); fetchAll(); }}
        />
      )}
      {deleteExpense_ && (
        <DeleteModal
          expense={deleteExpense_}
          onClose={() => setDeleteExpense(null)}
          onDeleted={() => { setDeleteExpense(null); fetchAll(); }}
        />
      )}
      {viewReceipt && <ReceiptViewer url={viewReceipt} onClose={() => setViewReceipt(null)} />}
    </div>
  );
}
