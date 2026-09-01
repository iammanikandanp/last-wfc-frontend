import React, { useState, useEffect } from 'react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { Plus, Search, Box, Coffee, X, Filter, Calendar, Trash2 } from 'lucide-react';

const rupee = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (value) => value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'half', label: '6 Mo' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
];
const PERIOD_FULL = {
  today: 'Today', week: 'This Week', month: 'This Month', quarter: 'This Quarter',
  half: '6 Months', year: 'This Year', all: 'All Time', custom: 'Custom',
};

function periodRange(key, s, e) {
  if (key === 'custom') {
    return {
      start: s ? new Date(s + 'T00:00:00') : new Date(2000, 0, 1),
      end: e ? new Date(e + 'T23:59:59') : new Date(),
    };
  }
  const end = new Date(), start = new Date();
  if (key === 'today') { start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); return { start, end }; }
  else if (key === 'week') start.setDate(start.getDate() - 7);
  else if (key === 'month') { start.setMonth(start.getMonth() - 1); start.setDate(1); }
  else if (key === 'quarter') { start.setMonth(start.getMonth() - 3); start.setDate(1); }
  else if (key === 'half') { start.setMonth(start.getMonth() - 6); start.setDate(1); }
  else if (key === 'year') { start.setFullYear(start.getFullYear() - 1); start.setDate(1); }
  else start.setFullYear(2000);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function inRange(dateStr, { start, end }) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

const STATUS_TABS = [
  { key: 'All', label: 'All' },
  { key: 'Paid', label: 'Paid' },
  { key: 'Unpaid', label: 'Unpaid' },
  { key: 'Extra', label: 'Extra Amount' },
];


export default function Cafeteria() {
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [recordLoading, setRecordLoading] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockDefaultThreshold, setStockDefaultThreshold] = useState(5);
  const [editingStock, setEditingStock] = useState(null);
  const [recordForm, setRecordForm] = useState({ memberId: '', itemId: '', quantity: '', paidAmount: '', extraAmount: '', paymentStatus: 'Unpaid' });
  const [memberBalance, setMemberBalance] = useState(0);
  const [settlePrevious, setSettlePrevious] = useState(false);
  const [period, setPeriod] = useState('week');
  const [custStart, setCustStart] = useState('');
  const [custEnd, setCustEnd] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedHistoryMember, setSelectedHistoryMember] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const selectedItem = stockItems.find((item) => item._id === recordForm.itemId);
  const selectedMember = members.find((member) => member._id === recordForm.memberId);
  const itemAmount = selectedItem ? Number(selectedItem.costPerUnit || 0) * Number(recordForm.quantity || 0) : 0;
  const currentAmount = itemAmount + Number(recordForm.extraAmount || 0);
  const totalPayable = settlePrevious ? Math.max(0, currentAmount - memberBalance) : currentAmount;
  const balance = Math.max(0, totalPayable - Number(recordForm.paidAmount || 0));

  const getStockStatus = (item) => {
    if (!item) return { label: 'Unknown', color: 'bg-slate-100 text-slate-600' };
    const thr = item.lowStockThreshold !== undefined ? Number(item.lowStockThreshold) : (item.minStockLevel !== undefined ? Number(item.minStockLevel) : 0);
    if (item.quantity <= 0) return { label: 'Out of stock', color: 'bg-rose-100 text-rose-700' };
    if (thr && item.quantity <= thr) return { label: 'Low', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Normal', color: 'bg-emerald-100 text-emerald-700' };
  };

  const getStockFill = (item) => {
    if (!item) return 0;
    const thr = item.lowStockThreshold !== undefined ? Number(item.lowStockThreshold) : (item.minStockLevel !== undefined ? Number(item.minStockLevel) : 1);
    const baseline = Math.max(1, thr * 3);
    return Math.min(100, Math.max(0, Math.round((item.quantity / baseline) * 100)));
  };

  const filteredMembers = members.filter((member) => {
    const term = (memberSearch || '').trim().toLowerCase();
    if (!term) return true;
    return member.name?.toLowerCase().includes(term) || member.phone?.includes(term);
  }).slice(0, 8);

  const filteredItems = (stockItems || []).filter((item) => {
    const term = (itemSearch || '').trim().toLowerCase();
    if (!term) return true;
    return item.itemName?.toLowerCase().includes(term);
  });

  const fetchDashboard = async () => {
    try {
      const res = await CustomBaseUrl.get('/cafeteria/dashboard');
      setDashboard(res.data?.data || null);
    } catch {
      toast.error('Failed to load cafeteria dashboard');
    }
  };

  useEffect(() => {
    // ensure current stock is available for Add Record dropdown
    fetchStockItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStockItems = async () => {
    setStockLoading(true);
    try {
      const res = await CustomBaseUrl.get('/cafeteria/stock');
      setStockItems(res.data?.data || []);
    } catch (e) {
      toast.error('Failed to load stock items');
    } finally { setStockLoading(false); }
  };

  const fetchTransactions = async () => {
    try {
      const res = await CustomBaseUrl.get(`/cafeteria/transactions`);
      setTransactions(res.data?.data || []);
    } catch {
    }
  };

  const handleDeleteStock = async (id) => {
    if (!window.confirm('Are you sure you want to delete this stock item?')) return;
    try {
      await CustomBaseUrl.delete(`/cafeteria/stock/${id}`);
      toast.success('Stock item deleted');
      fetchStockItems();
      fetchDashboard();
    } catch (e) {
      toast.error('Failed to delete stock item');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction? Stock will be refunded.')) return;
    try {
      await CustomBaseUrl.delete(`/cafeteria/transactions/${id}`);
      toast.success('Transaction deleted');
      fetchTransactions();
      fetchDashboard();
      fetchStockItems();
    } catch (e) {
      toast.error('Failed to delete transaction');
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await CustomBaseUrl.get('/fetch');
      const active = (res.data?.data || []).filter((member) => {
        if (!member?.endDate) return false;
        const diff = Math.ceil((new Date(member.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return diff > 7;
      });
      setMembers(active);
    } catch {
      toast.error('Failed to load members');
    }
  };

  const fetchMemberBalance = async (memberId) => {
    if (!memberId) {
      setMemberBalance(0);
      return;
    }
    try {
      const res = await CustomBaseUrl.get(`/cafeteria/member-balance/${memberId}`);
      setMemberBalance(res.data?.balance || 0);
    } catch {
      toast.error('Failed to load member balance');
    }
  };

  useEffect(() => {
    fetchMemberBalance(recordForm.memberId);
  }, [recordForm.memberId]);

  useEffect(() => {
    fetchDashboard();
    fetchMembers();
    fetchTransactions();
  }, []);

  const range = periodRange(period, custStart, custEnd);
  const txInRange = transactions.filter((tx) => inRange(tx.transactionDate, range));

  const visibleTransactions = txInRange.filter((tx) => {
    const term = searchTerm.trim().toLowerCase();

    // Status tab filter
    if (activeTab !== 'All') {
      if (activeTab === 'Extra' && (tx.extraAmount || 0) <= 0) return false;
      if (activeTab !== 'Extra' && tx.paymentStatus !== activeTab) return false;
    }

    if (!term) return true;
    return (tx.memberName || '').toLowerCase().includes(term)
      || (tx.itemName || '').toLowerCase().includes(term)
      || (tx.paymentStatus || '').toLowerCase().includes(term);
  });

  const memberBalanceMap = {};
  transactions.forEach(tx => {
    const memId = tx.member?._id || tx.member;
    if (!memId) return;
    if (!memberBalanceMap[memId]) {
      memberBalanceMap[memId] = {
        memberId: memId,
        memberName: tx.memberName || tx.member?.name || 'Unknown',
        unpaidBalance: 0,
        extraBalance: 0,
        history: []
      };
    }
    if (tx.paymentStatus === 'Unpaid') {
      memberBalanceMap[memId].unpaidBalance += Math.max(0, (tx.totalAmount || 0) - (tx.paidAmount || 0));
    }
    memberBalanceMap[memId].extraBalance += (tx.extraAmount || 0);
    memberBalanceMap[memId].history.push(tx);
  });

  const unpaidMembers = Object.values(memberBalanceMap).filter(m => m.unpaidBalance > 0);
  const extraMembers = Object.values(memberBalanceMap).filter(m => m.extraBalance > 0);

  const termLower = searchTerm.trim().toLowerCase();
  const visibleUnpaid = unpaidMembers.filter(m => !termLower || m.memberName.toLowerCase().includes(termLower));
  const visibleExtra = extraMembers.filter(m => !termLower || m.memberName.toLowerCase().includes(termLower));


  const handlePayBalance = async (memberId) => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    setPaymentLoading(true);
    try {
      await CustomBaseUrl.post(`/cafeteria/member-balance/${memberId}/pay`, { amount });
      toast.success('Payment applied successfully');
      setPaymentAmount('');
      await refreshData();
      // Optionally update selectedHistoryMember state if needed, or close popup
      setSelectedHistoryMember(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const refreshData = async () => {
    await Promise.all([fetchDashboard(), fetchTransactions()]);
  };



  const saveTransaction = async () => {
    if (!recordForm.memberId) return toast.error('Select a member');
    if (!recordForm.itemId) return toast.error('Select an item');
    if (!recordForm.quantity || Number(recordForm.quantity) <= 0) return toast.error('Enter quantity');

    if (selectedItem && Number(recordForm.quantity) > selectedItem.quantity) {
      return toast.error(`Only ${selectedItem.quantity} ${selectedItem.unit || 'units'} available in stock`);
    }
    setRecordLoading(true);
    try {
      await CustomBaseUrl.post('/cafeteria/transactions', {
        memberId: recordForm.memberId,
        itemId: recordForm.itemId,
        quantity: Number(recordForm.quantity),
        paidAmount: Number(recordForm.paidAmount || 0),
        extraAmount: Number(recordForm.extraAmount || 0),
        paymentStatus: recordForm.paymentStatus,
        settlePreviousBalance: settlePrevious,
      });
      toast.success('Transaction saved successfully');
      setShowRecordModal(false);
      setRecordForm({ memberId: '', itemId: '', quantity: '', paidAmount: '', extraAmount: '', paymentStatus: 'Unpaid' });
      setMemberSearch('');
      setItemSearch('');
      setSettlePrevious(false);
      await Promise.all([refreshData(), fetchStockItems()]);
    } catch (err) {
      console.error('Save transaction error:', err?.response || err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to save transaction');
    } finally {
      setRecordLoading(false);
    }
  };


  const summary = {
    totalTransactions: txInRange.length,
    paidCount: txInRange.filter(t => t.paymentStatus === "Paid").length,
    unpaidCount: txInRange.filter(t => t.paymentStatus === "Unpaid").length,
    totalAmount: txInRange.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    totalCollected: txInRange.reduce((sum, t) => sum + (t.paidAmount || 0), 0),
    totalPending: txInRange.reduce((sum, t) => sum + Math.max(0, (t.totalAmount || 0) - (t.paidAmount || 0)), 0),
    totalExtraAmount: txInRange.reduce((sum, t) => sum + (t.extraAmount || 0), 0),
  };

  // ── Add Stock Item Form (inside Stock Management modal)
  const AddStockItemForm = ({ defaultThreshold = 5, onSaved = () => { } }) => {
    const [form, setForm] = useState({ itemName: '', quantity: '', unit: 'Piece', lowStockThreshold: defaultThreshold, costPerUnit: '' });
    const [loading, setLoading] = useState(false);
    const save = async () => {
      if (!form.itemName) return toast.error('Enter item name');
      setLoading(true);
      try {
        await CustomBaseUrl.post('/cafeteria/stock', {
          itemName: form.itemName,
          unit: form.unit,
          quantity: Number(form.quantity || 0),
          lowStockThreshold: Number(form.lowStockThreshold || defaultThreshold),
          costPerUnit: form.costPerUnit !== '' ? Number(form.costPerUnit) : undefined,
        });
        setForm({ itemName: '', quantity: '', unit: 'Piece', lowStockThreshold: defaultThreshold, costPerUnit: '' });
        onSaved();
      } catch (e) { toast.error(e.response?.data?.message || 'Failed to add stock item'); }
      finally { setLoading(false); }
    };
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <input aria-label="Item Name" name="itemName" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} placeholder="Item name (Egg, Bread)" className="rounded-2xl border border-slate-200 bg-white px-4 py-2" />
        <input aria-label="Quantity" name="quantity" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} type="number" placeholder="Quantity" className="rounded-2xl border border-slate-200 bg-white px-4 py-2" />
        <select aria-label="Unit" name="unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
          {['Piece', 'Gram', 'Kilogram', 'Milliliter', 'Liter', 'Scoop'].map(u => (<option key={u} value={u}>{u}</option>))}
        </select>
        <input aria-label="Low Stock Threshold" name="lowStockThreshold" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} type="number" placeholder="Min stock level" className="rounded-2xl border border-slate-200 bg-white px-4 py-2" />
        <input aria-label="Cost Per Unit" name="costPerUnit" value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} type="number" placeholder="Cost per unit (optional)" className="rounded-2xl border border-slate-200 bg-white px-4 py-2" />
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-white">{loading ? 'Saving...' : 'Add Item'}</button>
        </div>
      </div>
    );
  };

  // ── Modify / Refill Stock Modal
  const ModifyStockModal = ({ stock, onClose }) => {
    const [form, setForm] = useState({ itemName: stock.itemName, unit: stock.unit || 'Piece', quantity: stock.quantity, lowStockThreshold: stock.lowStockThreshold || 5, costPerUnit: stock.costPerUnit || 0 });
    const [refillQty, setRefillQty] = useState('');
    const [loading, setLoading] = useState(false);

    const save = async () => {
      setLoading(true);
      try {
        // Update basic fields
        await CustomBaseUrl.put(`/cafeteria/stock/${stock._id}`, {
          itemName: form.itemName,
          unit: form.unit,
          lowStockThreshold: Number(form.lowStockThreshold || 0),
          quantity: Number(form.quantity),
          costPerUnit: Number(form.costPerUnit),
        });
        // Refill if requested
        if (refillQty && Number(refillQty) > 0) {
          await CustomBaseUrl.post(`/cafeteria/stock/${stock._id}/refill`, { quantity: Number(refillQty) });
        }
        toast.success('Stock updated');
        onClose();
      } catch (e) { toast.error(e.response?.data?.message || 'Failed to update stock'); }
      finally { setLoading(false); }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Modify Stock — {stock.itemName}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="modItemName" className="text-sm text-slate-600">Item Name</label>
              <input id="modItemName" name="itemName" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} className="w-full mt-2 rounded-2xl border border-slate-200 px-4 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="modUnit" className="text-sm text-slate-600">Unit</label>
                <select id="modUnit" name="unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full mt-2 rounded-2xl border border-slate-200 px-4 py-2">
                  {['Piece', 'Gram', 'Kilogram', 'Milliliter', 'Liter', 'Scoop'].map(u => (<option key={u} value={u}>{u}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor="modMinStock" className="text-sm text-slate-600">Min stock level</label>
                <input id="modMinStock" name="lowStockThreshold" type="number" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} className="w-full mt-2 rounded-2xl border border-slate-200 px-4 py-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="modQuantity" className="text-sm text-slate-600">Set Quantity (current: {stock.quantity})</label>
                <input id="modQuantity" name="quantity" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full mt-2 rounded-2xl border border-slate-200 px-4 py-2" />
              </div>
              <div>
                <label htmlFor="modCost" className="text-sm text-slate-600">Price per unit</label>
                <input id="modCost" name="costPerUnit" type="number" value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} className="w-full mt-2 rounded-2xl border border-slate-200 px-4 py-2" />
              </div>
            </div>
            <div>
              <label htmlFor="modRefill" className="text-sm text-slate-600">Refill Quantity (add)</label>
              <input id="modRefill" name="refillQty" type="number" value={refillQty} onChange={e => setRefillQty(e.target.value)} placeholder="Enter refill amount to add" className="w-full mt-2 rounded-2xl border border-slate-200 px-4 py-2" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2">Cancel</button>
              <button onClick={save} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-white">{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Coffee size={22} className="text-amber-600" />
              <h1 className="text-2xl font-bold text-slate-900">Cafeteria</h1>
            </div>
            <p className="text-sm text-slate-500">Food consumption, stock and payment management for admins.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setShowRecordModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
              <Plus size={16} /> New Record
            </button>
            <button onClick={async () => { setShowStockModal(true); await fetchStockItems(); }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              <Box size={16} /> Stock Management
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm flex-wrap gap-0.5">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-all ${period === p.key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar size={12} className="text-slate-400" />
              <input aria-label="Custom Start Date" name="customStart" type="date" value={custStart} onChange={e => setCustStart(e.target.value)}
                className="text-xs text-slate-700 border-none outline-none bg-transparent cursor-pointer" />
              <span className="text-slate-300 text-xs">→</span>
              <input aria-label="Custom End Date" name="customEnd" type="date" value={custEnd} onChange={e => setCustEnd(e.target.value)}
                className="text-xs text-slate-700 border-none outline-none bg-transparent cursor-pointer" />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Total Transactions</p>
            <p className="text-3xl font-black text-slate-900">{summary.totalTransactions}</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Total Amount</p>
            <p className="text-3xl font-black text-slate-900">{rupee(summary.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Total Collected</p>
            <p className="text-3xl font-black text-emerald-700">{rupee(summary.totalCollected)}</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Pending Amount</p>
            <p className="text-3xl font-black text-rose-600">{rupee(summary.totalPending)}</p>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Transaction history</p>
              <h2 className="text-lg font-bold text-slate-900">All cafeteria records</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-slate-500">Showing {visibleTransactions.length} records</p>
            <div className="relative w-full lg:w-[320px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchTerm} placeholder="Search member, item or status…"
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search" name="searchTerm"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {activeTab === 'Unpaid' || activeTab === 'Extra' ? (
              <table className="w-full text-sm text-left border-separate border-spacing-y-3 min-w-[600px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    <th className="pb-3 pr-3 pl-3">Member Name</th>
                    <th className="pb-3 pr-3 text-right">{activeTab === 'Unpaid' ? 'Remaining Balance' : 'Extra/Credit Balance'}</th>
                    <th className="pb-3 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'Unpaid' ? visibleUnpaid : visibleExtra).length === 0 ? (
                    <tr><td colSpan="3" className="py-12 text-center text-slate-400">No members found for this filter.</td></tr>
                  ) : (activeTab === 'Unpaid' ? visibleUnpaid : visibleExtra).map((m) => (
                    <tr key={m.memberId} className="bg-slate-50 cursor-pointer hover:bg-slate-100 transition shadow-sm" onClick={() => setSelectedHistoryMember(m)}>
                      <td className="py-4 pr-3 pl-4 rounded-l-2xl font-semibold text-slate-900">{m.memberName}</td>
                      <td className={`py-4 pr-3 text-right font-black ${activeTab === 'Unpaid' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {activeTab === 'Unpaid' ? `- ${rupee(m.unpaidBalance)}` : `+ ${rupee(m.extraBalance)}`}
                      </td>
                      <td className="py-4 pr-4 rounded-r-2xl text-right">
                        <button className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm text-left min-w-[1024px] border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    <th className="pb-3 pr-3 pl-3">Name</th>
                    <th className="pb-3 pr-3">Item</th>
                    <th className="pb-3 pr-3">Qty</th>
                    <th className="pb-3 pr-3">Total</th>
                    <th className="pb-3 pr-3">Paid</th>
                    <th className="pb-3 pr-3">Remaining</th>
                    <th className="pb-3 pr-3">Extra Paid</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 pr-3">Time</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.length === 0 ? (
                    <tr><td colSpan="10" className="py-12 text-center text-slate-400">No transactions found for this filter.</td></tr>
                  ) : visibleTransactions.map((tx) => (
                    <tr key={tx._id} className="bg-slate-50">
                      <td className="py-3 pr-3 pl-3 rounded-l-2xl font-semibold text-slate-800">{tx.memberName}</td>
                      <td className="py-3 pr-3 text-slate-600">{tx.itemName}</td>
                      <td className="py-3 pr-3 text-slate-600">{tx.quantity}</td>
                      <td className="py-3 pr-3 text-slate-600">{rupee(tx.itemAmount)}</td>
                      <td className="py-3 pr-3 text-slate-600">{rupee(tx.paidAmount)}</td>
                      <td className="py-3 pr-3 text-slate-600">{rupee(Math.max(0, tx.totalAmount - tx.paidAmount))}</td>
                      <td className="py-3 pr-3 text-slate-600">{rupee(Math.max(0, tx.paidAmount - tx.totalAmount))}</td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${tx.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{tx.paymentStatus}</span>
                      </td>
                      <td className="py-3 pr-3 text-slate-500">{fmtDate(tx.transactionDate)}</td>
                      <td className="py-3 pr-3 text-slate-500">{fmtTime(tx.transactionDate)}</td>
                      <td className="py-3 rounded-r-2xl">
                        <button onClick={() => handleDeleteTransaction(tx._id)} className="text-slate-400 hover:text-rose-600 transition p-1"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>


      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Stock Management</h2>
                <p className="text-sm text-slate-500">View, refill and add stock items. All changes are saved to the database.</p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="defaultStockThreshold" className="text-sm text-slate-500">Default min stock</label>
                <input id="defaultStockThreshold" name="defaultStockThreshold" type="number" value={stockDefaultThreshold} onChange={e => setStockDefaultThreshold(Number(e.target.value || 0))} className="w-20 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm" />
                <button onClick={() => { setShowStockModal(false); setEditingStock(null); }} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Current Stock Items</p>
                  <div className="flex items-center gap-2">
                    <input aria-label="Search Stock" name="searchStock" placeholder="Search" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" onChange={(e) => {/* no-op for now */ }} />
                  </div>
                </div>
                {stockLoading ? <div className="text-center py-8 text-slate-400">Loading...</div> : (
                  <div className="grid gap-3">
                    {stockItems.length === 0 ? <div className="text-slate-400">No stock items found.</div> : stockItems.map(it => {
                      const status = it.quantity <= 0 ? 'Out of Stock' : (it.quantity <= it.lowStockThreshold ? 'Low Stock' : 'Normal');
                      return (
                        <div key={it._id} className="rounded-xl border border-slate-100 p-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{it.itemName} <span className="text-xs text-slate-500">· {it.unit}</span></p>
                            <p className="text-sm text-slate-600">Qty: <strong>{it.quantity}</strong> · Min: {it.lowStockThreshold}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${status === 'Normal' ? 'bg-emerald-100 text-emerald-700' : status === 'Low Stock' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{status}</span>
                            <button onClick={() => setEditingStock(it)} className="text-sm px-3 py-2 bg-slate-900 text-white rounded-xl">Modify</button>
                            <button onClick={() => handleDeleteStock(it._id)} className="text-sm px-3 py-2 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 transition"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm font-semibold mb-2">Add New Stock Item</p>
                <AddStockItemForm defaultThreshold={stockDefaultThreshold} onSaved={async () => { await fetchStockItems(); await fetchDashboard(); toast.success('Item added'); }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {editingStock && (
        <ModifyStockModal stock={editingStock} onClose={() => { setEditingStock(null); fetchStockItems(); fetchDashboard(); }} />
      )}

      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl my-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur-md rounded-t-3xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900">New Cafeteria Record</h2>
              </div>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              {/* Select Member & Previous Balance */}
              <div className="space-y-3">
                <div className="relative">
                  <label htmlFor="memberSearch" className="text-sm font-semibold text-slate-700">Select Member</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <Search size={16} className="text-slate-400" />
                    <input id="memberSearch" name="memberSearch" type="text" value={memberSearch || ''}
                      onFocus={() => setShowMemberDropdown(true)}
                      onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                      onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
                      placeholder="Search member..." className="w-full bg-transparent text-sm text-slate-900 outline-none" />
                  </div>
                  {showMemberDropdown && filteredMembers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-40 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {filteredMembers.map((member) => (
                        <button key={member._id} onMouseDown={() => { setRecordForm((prev) => ({ ...prev, memberId: member._id })); setMemberSearch(member.name); setShowMemberDropdown(false); }}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                          <div className="font-semibold">{member.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {recordForm.memberId && (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Previous Balance</p>
                      <p className={`text-base font-black ${memberBalance < 0 ? 'text-rose-600' : memberBalance > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {memberBalance < 0 ? `- ${rupee(Math.abs(memberBalance))}` : memberBalance > 0 ? `+ ${rupee(memberBalance)}` : '₹0'}
                      </p>
                    </div>
                    {memberBalance !== 0 && (
                      <label htmlFor="settlePrevious" className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition">
                        <input id="settlePrevious" name="settlePrevious" type="checkbox" checked={settlePrevious} onChange={(e) => setSettlePrevious(e.target.checked)} className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900" />
                        <span className="text-xs font-bold text-slate-700">Settle Balance</span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Select Item & Quantity */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 relative">
                  <label htmlFor="itemSearch" className="text-sm font-semibold text-slate-700">Select Item</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <Filter size={16} className="text-slate-400" />
                    <input id="itemSearch" name="itemSearch" type="text" value={itemSearch || ''}
                      onFocus={() => setShowItemDropdown(true)}
                      onChange={(e) => { setItemSearch(e.target.value); setShowItemDropdown(true); }}
                      onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                      placeholder="Search item..." className="w-full bg-transparent text-sm text-slate-900 outline-none" />
                  </div>
                  {showItemDropdown && filteredItems.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-40 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {filteredItems.map((item) => (
                        <button key={item._id} onMouseDown={() => { setRecordForm((prev) => ({ ...prev, itemId: item._id })); setItemSearch(item.itemName); setShowItemDropdown(false); }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                          <div className="font-semibold">{item.itemName}</div>
                          <div className="text-xs text-slate-400">₹{item.costPerUnit || 0} · {item.quantity} {item.unit || 'units'} left</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-1">
                  <label htmlFor="recordQuantity" className="text-sm font-semibold text-slate-700">Quantity</label>
                  <input id="recordQuantity" name="recordQuantity" type="number" value={recordForm.quantity} onChange={(e) => setRecordForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder="1" className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>

              {/* Amount & Amount Paid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Amount</label>
                  <div className="mt-1.5 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900 flex items-center">
                    {rupee(currentAmount)}
                  </div>
                </div>
                <div>
                  <label htmlFor="paidAmount" className="text-sm font-semibold text-slate-700">Amount Paid</label>
                  <input id="paidAmount" name="paidAmount" type="number" value={recordForm.paidAmount} onChange={(e) => setRecordForm((prev) => ({ ...prev, paidAmount: e.target.value, paymentStatus: (Number(e.target.value || 0) >= totalPayable ? 'Paid' : 'Unpaid') }))}
                    placeholder="0" className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>

              {/* Summary / Calculation Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Current Transaction</span>
                  <span className="font-semibold text-slate-700">{rupee(currentAmount)}</span>
                </div>
                {settlePrevious && memberBalance !== 0 && (
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{memberBalance < 0 ? 'Previous Due Settled' : 'Credit Applied'}</span>
                    <span className={`font-semibold ${memberBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {memberBalance < 0 ? `+ ${rupee(Math.abs(memberBalance))}` : `- ${rupee(Math.min(memberBalance, currentAmount))}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
                  <span>Total Payable</span>
                  <span>{rupee(totalPayable)}</span>
                </div>
              </div>

              {/* Extra Amount / Balance & Payment Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    {Number(recordForm.paidAmount || 0) > totalPayable ? 'Extra Credit' : 'Remaining Due'}
                  </span>
                  <span className={`text-base font-black ${Number(recordForm.paidAmount || 0) > totalPayable ? 'text-emerald-600' : Number(recordForm.paidAmount || 0) < totalPayable ? 'text-rose-600' : 'text-slate-900'}`}>
                    {Number(recordForm.paidAmount || 0) > totalPayable
                      ? `+ ${rupee(Number(recordForm.paidAmount || 0) - totalPayable)}`
                      : Number(recordForm.paidAmount || 0) < totalPayable
                        ? `- ${rupee(totalPayable - Number(recordForm.paidAmount || 0))}`
                        : '₹0'}
                  </span>
                </div>
                <div>
                  <label htmlFor="paymentStatus" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                  <select id="paymentStatus" name="paymentStatus" value={recordForm.paymentStatus} onChange={(e) => setRecordForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200 appearance-none">
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid / Partial</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-6 bg-slate-50 rounded-b-3xl">
              <button type="button" onClick={saveTransaction} disabled={recordLoading}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {recordLoading ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedHistoryMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl my-auto flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 rounded-t-3xl bg-slate-50/80 backdrop-blur-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedHistoryMember.memberName}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Detailed cafeteria transaction history</p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Current Balance</p>
                  <p className={`text-xl font-black ${activeTab === 'Unpaid' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {activeTab === 'Unpaid' ? `- ${rupee(selectedHistoryMember.unpaidBalance)}` : `+ ${rupee(selectedHistoryMember.extraBalance)}`}
                  </p>
                </div>
                <div className="h-10 w-px bg-slate-200"></div>
                <button onClick={() => setSelectedHistoryMember(null)} className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-full p-2.5 transition">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <table className="w-full text-sm text-left min-w-[800px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    <th className="pb-2 pr-3 pl-3">Date</th>
                    <th className="pb-2 pr-3">Item</th>
                    <th className="pb-2 pr-3">Qty</th>
                    <th className="pb-2 pr-3">Total Cost</th>
                    <th className="pb-2 pr-3">Paid</th>
                    <th className="pb-2 pr-3">Balance</th>
                    <th className="pb-2 pr-3">Extra Generated</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedHistoryMember.history.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)).map((tx) => (
                    <tr key={tx._id} className="bg-slate-50">
                      <td className="py-3 pr-3 pl-3 rounded-l-xl text-slate-500">{fmtDate(tx.transactionDate)}</td>
                      <td className="py-3 pr-3 font-medium text-slate-700">{tx.itemName}</td>
                      <td className="py-3 pr-3 text-slate-600">{tx.quantity}</td>
                      <td className="py-3 pr-3 text-slate-600">{rupee(tx.totalAmount)}</td>
                      <td className="py-3 pr-3 text-emerald-600 font-medium">{rupee(tx.paidAmount)}</td>
                      <td className="py-3 pr-3 text-rose-600 font-medium">{tx.totalAmount > tx.paidAmount ? rupee(tx.totalAmount - tx.paidAmount) : '—'}</td>
                      <td className="py-3 pr-3 text-emerald-600 font-medium">{tx.paidAmount > tx.totalAmount ? `+ ${rupee(tx.paidAmount - tx.totalAmount)}` : '—'}</td>
                      <td className="py-3 rounded-r-xl">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${tx.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{tx.paymentStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
