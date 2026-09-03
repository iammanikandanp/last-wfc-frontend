import React, { useState, useEffect } from 'react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { Plus, Search, Box, Coffee, X, Filter, Calendar, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

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
  { key: 'Admin', label: 'Admin' },
];



const PER_PAGE = 10;

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

export default function Cafeteria() {
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [page, setPage] = useState(1);
  const [recordLoading, setRecordLoading] = useState(false);
  const [isSelfMode, setIsSelfMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockDefaultThreshold, setStockDefaultThreshold] = useState(5);
  const [editingStock, setEditingStock] = useState(null);
  const [recordForm, setRecordForm] = useState({ memberId: '', itemId: '', quantity: '', paidAmount: '', extraAmount: '', paymentStatus: 'Unpaid', paymentMode: 'Cash' });
  const [memberBalance, setMemberBalance] = useState(0);
  const [settlePrevious, setSettlePrevious] = useState(false);
  const [period, setPeriod] = useState('week');
  const [custStart, setCustStart] = useState('');
  const [custEnd, setCustEnd] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [billItems, setBillItems] = useState([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedHistoryMember, setSelectedHistoryMember] = useState(null);
  const [selectedHistoryStock, setSelectedHistoryStock] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const selectedItem = stockItems.find((item) => item._id === recordForm.itemId);
  const selectedMember = members.find((member) => member._id === recordForm.memberId);
  const itemAmount = selectedItem ? Number(selectedItem.costPerUnit || 0) * Number(recordForm.quantity || 0) : 0;
  
  // Calculate bill total dynamically from added items
  const currentBillTotal = billItems.reduce((sum, item) => sum + item.amount, 0);
  const totalPayable = settlePrevious ? Math.max(0, currentBillTotal - memberBalance) : currentBillTotal;
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
    if (!term) return false;
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
      if (selectedHistoryMember) {
        setSelectedHistoryMember(prev => ({
          ...prev,
          history: prev.history.filter(tx => tx._id !== id)
        }));
      }
    } catch (e) {
      toast.error('Failed to delete transaction');
    }
  };

  const handleDeleteAllTransactions = async () => {
    if (!window.confirm('Are you sure you want to delete ALL cafeteria transactions? This cannot be undone and stock will be refunded.')) return;
    try {
      await CustomBaseUrl.delete(`/cafeteria/transactions`);
      toast.success('All transactions deleted');
      fetchTransactions();
      fetchDashboard();
      fetchStockItems();
      setSelectedHistoryMember(null);
    } catch (e) {
      toast.error('Failed to delete all transactions');
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await CustomBaseUrl.get('/fetch');
      const active = (res.data?.data || []).filter((member) => {
        if (!member?.endDate) return false;
        const diff = Math.ceil((new Date(member.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return diff >= 0;
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
    const isAdmin = tx.transactionType === 'admin' || tx.paymentStatus === 'Admin';
    if (activeTab === 'Admin') {
      if (!isAdmin) return false;
    } else {
      if (isAdmin) return false;
      if (activeTab !== 'All') {
        if (activeTab === 'Extra' && (tx.extraAmount || 0) <= 0) return false;
        if (activeTab !== 'Extra' && tx.paymentStatus !== activeTab) return false;
      }
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



  const handleAddBillItem = () => {
    if (!recordForm.itemId) return toast.error('Select an item');
    if (!recordForm.quantity || Number(recordForm.quantity) <= 0) return toast.error('Enter a valid quantity');
    
    if (selectedItem && Number(recordForm.quantity) > selectedItem.quantity) {
      return toast.error(`Only ${selectedItem.quantity} ${selectedItem.unit || 'units'} available in stock`);
    }

    const itemCost = Number(selectedItem.costPerUnit || 0);
    const qty = Number(recordForm.quantity);
    const amount = itemCost * qty;

    setBillItems(prev => [...prev, {
      itemId: selectedItem._id,
      itemName: selectedItem.itemName,
      quantity: qty,
      amount
    }]);

    // Reset item selection fields
    setRecordForm(prev => ({ ...prev, itemId: '', quantity: '' }));
    setItemSearch('');
  };

  const saveTransaction = async () => {
    setFormError('');
    if (!isSelfMode && !recordForm.memberId) {
      setFormError('Please select a member');
      return;
    }
    if (billItems.length === 0) {
      setFormError('Please select an item and add it to the bill');
      return;
    }
    if (!isSelfMode && (recordForm.paidAmount === '' || recordForm.paidAmount === null)) {
       setFormError('Please enter amount paid (0 is fine)');
       return;
    }

    setRecordLoading(true);
    try {
      await CustomBaseUrl.post('/cafeteria/transactions', {
        transactionType: isSelfMode ? 'admin' : 'member',
        memberId: isSelfMode ? undefined : recordForm.memberId,
        items: billItems.map(item => ({
          itemId: item.itemId,
          quantity: Number(item.quantity)
        })),
        paidAmount: isSelfMode ? 0 : Number(recordForm.paidAmount || 0),
        paymentMode: isSelfMode ? undefined : recordForm.paymentMode,
        settlePreviousBalance: isSelfMode ? false : settlePrevious,
      });

      toast.success('Transaction saved successfully');
      setShowRecordModal(false);
      setRecordForm({ memberId: '', itemId: '', quantity: '', paidAmount: '', extraAmount: '', paymentStatus: 'Unpaid', paymentMode: 'Cash' });
      setMemberSearch('');
      setItemSearch('');
      setBillItems([]);
      setSettlePrevious(false);
      setIsSelfMode(false);
      await Promise.all([refreshData(), fetchStockItems()]);
    } catch (err) {
      console.error('Save transaction error:', err?.response || err);
      setFormError(err?.response?.data?.message || err.message || 'Failed to save transaction');
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
    const [form, setForm] = useState({ itemName: '', unit: 'Piece', lowStockThreshold: defaultThreshold, costPerUnit: '' });
    const [loading, setLoading] = useState(false);
    const save = async () => {
      if (!form.itemName) return toast.error('Enter item name');
      setLoading(true);
      try {
        await CustomBaseUrl.post('/cafeteria/stock', {
          itemName: form.itemName,
          unit: form.unit,
          quantity: 0,
          lowStockThreshold: Number(form.lowStockThreshold || defaultThreshold),
          costPerUnit: form.costPerUnit !== '' ? Number(form.costPerUnit) : undefined,
        });
        setForm({ itemName: '', unit: 'Piece', lowStockThreshold: defaultThreshold, costPerUnit: '' });
        onSaved();
      } catch (e) { toast.error(e.response?.data?.message || 'Failed to add stock item'); }
      finally { setLoading(false); }
    };
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <input aria-label="Item Name" name="itemName" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} placeholder="Item name (Egg, Bread)" className="rounded-2xl border border-slate-200 bg-white px-4 py-2" />
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
    const [totalRefillCost, setTotalRefillCost] = useState('');
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
          const payload = { quantity: Number(refillQty) };
          if (totalRefillCost !== undefined && totalRefillCost !== '') {
            payload.totalRefillAmount = Number(totalRefillCost);
          }
          await CustomBaseUrl.post(`/cafeteria/stock/${stock._id}/refill`, payload);
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
            <h3 className="text-lg font-bold">Refill Stock — {stock.itemName}</h3>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="modRefill" className="text-sm text-slate-600">Refill Quantity (add)</label>
                <input id="modRefill" name="refillQty" type="number" value={refillQty} onChange={e => setRefillQty(e.target.value)} placeholder="Qty to add" className="w-full mt-2 rounded-2xl border border-slate-200 px-4 py-2" />
              </div>
              <div>
                <label htmlFor="modTotalCost" className="text-sm text-slate-600">Total Refill Amount (₹)</label>
                <input id="modTotalCost" name="totalRefillCost" type="number" value={totalRefillCost} onChange={e => setTotalRefillCost(e.target.value)} placeholder="Total price" className="w-full mt-2 rounded-2xl border border-slate-200 px-4 py-2" />
              </div>
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

  // ── Stock History Modal
  const StockHistoryModal = ({ stock, onClose }) => {
    const [refills, setRefills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchRefills = async () => {
        try {
          const res = await CustomBaseUrl.get(`/cafeteria/stock/refill-history?stockId=${stock._id}`);
          setRefills(res.data?.data || []);
        } catch (e) {
          toast.error('Failed to load refill history');
        } finally {
          setLoading(false);
        }
      };
      fetchRefills();
    }, [stock._id]);

    // Sort refills by date
    const refillHistory = refills.map(r => ({ ...r, date: r.createdAt || r.updatedAt })).sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
        <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Refill History — {stock.itemName}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <p className="text-center text-slate-500 py-8">Loading history...</p>
            ) : refillHistory.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No refill history found for this item.</p>
            ) : (
              <div className="space-y-3">
                {refillHistory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-800">Refill <span className="text-emerald-600 text-sm">(+{item.quantity})</span></p>
                      <p className="text-xs text-slate-500">{fmtDate(item.date)} at {fmtTime(item.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">Cost: {rupee(item.totalRefillAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Edit Record Modal
  const EditRecordModal = ({ record, onClose }) => {
    const [additionalPayment, setAdditionalPayment] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [loading, setLoading] = useState(false);

    const total = record.totalAmount || 0;
    const currentPaid = record.paidAmount || 0;
    const currentRemaining = Math.max(0, total - currentPaid);
    
    const addedNum = Number(additionalPayment || 0);
    const newPaid = currentPaid + addedNum;
    const newRemaining = Math.max(0, total - newPaid);
    const newExtra = Math.max(0, newPaid - total);

    const handleUpdate = async () => {
      if (addedNum > 0 && !paymentMode) return toast.error('Select a payment mode');
      setLoading(true);
      try {
        await CustomBaseUrl.put(`/cafeteria/transactions/${record._id}`, {
          additionalPayment: addedNum,
          paymentMode
        });
        toast.success('Payment added successfully');
        onClose();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to add payment');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
        <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Add Payment</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">{record.itemName}</p>
              <p className="text-xs text-slate-500">Member: {record.memberName}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl flex flex-col gap-1 text-sm text-slate-600">
              <div className="flex justify-between"><span>Total:</span> <span>{rupee(total)}</span></div>
              <div className="flex justify-between"><span>Already Paid:</span> <span>{rupee(currentPaid)}</span></div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Current Remaining:</span> 
                <span className={currentRemaining > 0 ? "text-rose-600" : ""}>{currentRemaining > 0 ? rupee(currentRemaining) : '—'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Additional Payment Amount (₹)</label>
              <input type="number" value={additionalPayment} onChange={e => setAdditionalPayment(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-2 outline-none focus:border-slate-300" placeholder="0" />
            </div>
            {addedNum > 0 && (
              <div>
                <label className="text-sm text-slate-600 block mb-1">Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-slate-300">
                  <option value="Cash">Cash</option>
                  <option value="GPay">GPay</option>
                </select>
              </div>
            )}
            <div className="bg-emerald-50 p-3 rounded-2xl flex flex-col gap-1 text-sm text-slate-600 border border-emerald-100">
              <div className="flex justify-between">
                <span>New Remaining:</span> 
                <span className="font-bold text-rose-600">{newRemaining > 0 ? rupee(newRemaining) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>New Extra/Credit:</span> 
                <span className="font-bold text-emerald-600">{newExtra > 0 ? `+ ${rupee(newExtra)}` : '—'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button>
              <button onClick={handleUpdate} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white">{loading ? 'Saving...' : 'Save Payment'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  
  // Pagination calculations
  const listToPaginate = (activeTab === 'Unpaid' || activeTab === 'Extra')
    ? (activeTab === 'Unpaid' ? visibleUnpaid : visibleExtra)
    : visibleTransactions;
    
  const totalPages = Math.ceil(listToPaginate.length / PER_PAGE);
  const paginatedList = listToPaginate.slice((page-1)*PER_PAGE, page*PER_PAGE);

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
              <button key={p.key} onClick={() => { setPage(1); setPeriod(p.key) }}
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
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setPage(1); setActiveTab(tab.key) }}
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
                onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
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
                  ) : paginatedList.map((m) => (
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
                    <th className="pb-3 pr-3 pl-3">Date</th>
                    <th className="pb-3 pr-3">Member</th>
                    <th className="pb-3 pr-3">Item</th>
                    <th className="pb-3 pr-3">Qty</th>
                    {activeTab !== 'Admin' && (
                      <>
                        <th className="pb-3 pr-3">Total</th>
                        <th className="pb-3 pr-3">Paid</th>
                        <th className="pb-3 pr-3">Remaining</th>
                        <th className="pb-3 pr-3">Extra</th>
                        <th className="pb-3 pr-3">Status</th>
                        <th className="pb-3 pr-3">Mode</th>
                      </>
                    )}
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.length === 0 ? (
                    <tr><td colSpan="11" className="py-12 text-center text-slate-400">No transactions found for this filter.</td></tr>
                  ) : paginatedList.map((tx) => {
                    const remaining = Math.max(0, tx.totalAmount - tx.paidAmount);
                    const extra = Math.max(0, tx.paidAmount - tx.totalAmount);
                    const isAdmin = tx.transactionType === 'admin' || tx.paymentStatus === 'Admin';
                    return (
                    <tr key={tx._id} className="bg-slate-50">
                      <td className="py-3 pr-3 pl-3 rounded-l-2xl text-slate-500 align-top">{fmtDate(tx.transactionDate)}</td>
                      <td className="py-3 pr-3 font-semibold text-slate-800 align-top">{isAdmin ? <span className="text-slate-400 italic">Self Consumption</span> : tx.memberName}</td>
                      <td className="py-3 pr-3 text-slate-600 align-top">
                        {tx.items && tx.items.length > 0 
                          ? tx.items.map((i, idx) => <div key={idx} className="whitespace-nowrap">{i.itemName}</div>)
                          : tx.itemName}
                      </td>
                      <td className="py-3 pr-3 text-slate-600 align-top">
                        {tx.items && tx.items.length > 0 
                          ? tx.items.map((i, idx) => <div key={idx} className="whitespace-nowrap">{i.quantity}</div>)
                          : tx.quantity}
                      </td>
                      {activeTab !== 'Admin' && (
                        <>
                          <td className="py-3 pr-3 text-slate-600 align-top">{isAdmin ? '—' : (tx.totalAmount === 0 ? '—' : rupee(tx.totalAmount))}</td>
                          <td className="py-3 pr-3 text-slate-600 align-top">{isAdmin ? '—' : (tx.paidAmount === 0 ? '—' : rupee(tx.paidAmount))}</td>
                          <td className={`py-3 pr-3 align-top ${remaining > 0 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{isAdmin ? '—' : (remaining === 0 ? '—' : rupee(remaining))}</td>
                          <td className={`py-3 pr-3 align-top ${extra > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`}>{isAdmin ? '—' : (extra === 0 ? '—' : rupee(extra))}</td>
                          <td className="py-3 pr-3 align-top">
                            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${isAdmin ? 'bg-indigo-100 text-indigo-700' : (tx.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}`}>{isAdmin ? 'Admin / Self' : tx.paymentStatus}</span>
                          </td>
                          <td className="py-3 pr-3 text-slate-500 align-top">{isAdmin ? '—' : (tx.paymentMode || '—')}</td>
                        </>
                      )}
                      <td className="py-3 rounded-r-2xl align-top">
                        {!isAdmin && <button onClick={() => setEditingRecord(tx)} className="text-slate-400 hover:text-slate-900 transition p-1 mr-1" title="Add Payment"><Edit size={16}/></button>}
                        <button onClick={() => handleDeleteTransaction(tx._id)} className="text-slate-400 hover:text-rose-600 transition p-1" title="Delete"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <Pagination page={page} totalPages={totalPages} filtered={listToPaginate.length} onPage={setPage} />
          </div>
        </div>
      </div>

      {editingRecord && (
        <EditRecordModal record={editingRecord} onClose={() => { setEditingRecord(null); refreshData(); fetchStockItems(); }} />
      )}


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
              <div className="pb-4 border-b border-slate-100">
                <p className="text-sm font-semibold mb-2">Add New Stock Item</p>
                <AddStockItemForm defaultThreshold={stockDefaultThreshold} onSaved={async () => { await fetchStockItems(); await fetchDashboard(); toast.success('Item added'); }} />
              </div>

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
                            <button onClick={() => setSelectedHistoryStock(it)} className="text-sm px-3 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition">History</button>
                            <button onClick={() => setEditingStock(it)} className="text-sm px-3 py-2 bg-slate-900 text-white rounded-xl">Refill Stock</button>
                            <button onClick={() => handleDeleteStock(it._id)} className="text-sm px-3 py-2 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 transition"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingStock && (
        <ModifyStockModal stock={editingStock} onClose={() => { setEditingStock(null); fetchStockItems(); fetchDashboard(); }} />
      )}

      {selectedHistoryStock && (
        <StockHistoryModal stock={selectedHistoryStock} onClose={() => setSelectedHistoryStock(null)} />
      )}

      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl my-auto flex flex-col md:flex-row max-h-[90vh]">
            {/* LEFT COLUMN */}
            <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">New Cafeteria Record</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition">
                    <input type="checkbox" checked={isSelfMode} onChange={(e) => {setIsSelfMode(e.target.checked); setFormError('');}} className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900" />
                    <span className="text-sm font-bold text-slate-700">Self Mode</span>
                  </label>
                  <button onClick={() => {setShowRecordModal(false); setIsSelfMode(false); setFormError('');}} className="md:hidden text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {!isSelfMode && (
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
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3">
                          {member.profilePhoto ? <img src={member.profilePhoto} alt={member.name} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{member.name.charAt(0).toUpperCase()}</div>}
                          <div className="font-semibold">{member.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                )}

                <div className="flex gap-2 items-start">
                  <div className="relative flex-1">
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
                  <div className="w-24 relative">
                    <label htmlFor="recordQuantity" className="text-sm font-semibold text-slate-700">Qty</label>
                    <input id="recordQuantity" name="recordQuantity" type="number" value={recordForm.quantity} onChange={(e) => setRecordForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      placeholder="1" className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200" />
                    {selectedItem && Number(recordForm.quantity || 0) > selectedItem.quantity && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1 absolute whitespace-nowrap">Low Stock — Only {selectedItem.quantity} available</p>
                    )}
                  </div>
                  <button onClick={handleAddBillItem} className="mt-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center">
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="w-full md:w-1/2 flex flex-col p-6 overflow-y-auto bg-slate-50 rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">{isSelfMode ? 'Admin Consumption' : (selectedMember ? selectedMember.name : 'Billing Details')}</h3>
                <button onClick={() => setShowRecordModal(false)} className="hidden md:block text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-full p-2 transition">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 border border-slate-200 rounded-2xl bg-white p-3 space-y-2 min-h-[150px]">
                {billItems.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center mt-10">No items added yet</p>
                ) : (
                  billItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.itemName}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700">{rupee(item.amount)}</span>
                        <button onClick={() => setBillItems(prev => prev.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600 transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!isSelfMode && selectedMember && memberBalance !== 0 && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Previous Balance</p>
                    <p className={`text-sm font-black ${memberBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {memberBalance < 0 ? `- ${rupee(Math.abs(memberBalance))}` : `+ ${rupee(memberBalance)}`}
                    </p>
                  </div>
                  <label htmlFor="settlePrevious" className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">
                    <input id="settlePrevious" name="settlePrevious" type="checkbox" checked={settlePrevious} onChange={(e) => setSettlePrevious(e.target.checked)} className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900" />
                    <span className="text-xs font-bold text-slate-700">Settle Balance</span>
                  </label>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 space-y-4">
                {!isSelfMode && (
                  <>
                    <div className="flex items-center justify-between text-base font-bold text-slate-900">
                      <span>Total Payable</span>
                      <span>{rupee(totalPayable)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="paidAmount" className="text-sm font-semibold text-slate-700">Amount Paid</label>
                        <input id="paidAmount" name="paidAmount" type="number" value={recordForm.paidAmount} onChange={(e) => setRecordForm((prev) => ({ ...prev, paidAmount: e.target.value, paymentStatus: (Number(e.target.value || 0) >= totalPayable ? 'Paid' : 'Unpaid') }))}
                          placeholder="0" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200" />
                      </div>
                      <div>
                        <label htmlFor="paymentStatus" className="text-sm font-semibold text-slate-700">Status</label>
                        <select id="paymentStatus" name="paymentStatus" value={recordForm.paymentStatus} onChange={(e) => setRecordForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200 appearance-none">
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid / Partial</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex flex-col justify-center">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                          {Number(recordForm.paidAmount || 0) > totalPayable ? 'Extra Credit' : 'Remaining Due'}
                        </span>
                        <span className={`text-sm font-black ${Number(recordForm.paidAmount || 0) > totalPayable ? 'text-emerald-600' : Number(recordForm.paidAmount || 0) < totalPayable ? 'text-rose-600' : 'text-slate-900'}`}>
                          {Number(recordForm.paidAmount || 0) > totalPayable
                            ? `+ ${rupee(Number(recordForm.paidAmount || 0) - totalPayable)}`
                            : Number(recordForm.paidAmount || 0) < totalPayable
                              ? `- ${rupee(totalPayable - Number(recordForm.paidAmount || 0))}`
                              : '₹0'}
                        </span>
                      </div>
                      {Number(recordForm.paidAmount || 0) > 0 && (
                        <div>
                          <label htmlFor="paymentMode" className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Mode</label>
                          <select id="paymentMode" name="paymentMode" value={recordForm.paymentMode} onChange={(e) => setRecordForm((prev) => ({ ...prev, paymentMode: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200 appearance-none">
                            <option value="Cash">Cash</option>
                            <option value="GPay">GPay</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm font-semibold text-red-600">{formError}</p>
                  </div>
                )}

                <button type="button" onClick={saveTransaction} disabled={recordLoading}
                  className="w-full mt-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {recordLoading ? 'Saving...' : (isSelfMode ? 'Save Admin Consumption' : 'Save Transaction')}
                </button>
              </div>
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
                      <td className="py-3 pr-3 pl-3 rounded-l-xl text-slate-500 align-top">{fmtDate(tx.transactionDate)}</td>
                      <td className="py-3 pr-3 font-medium text-slate-700 align-top">
                        {tx.items && tx.items.length > 0 
                          ? tx.items.map((i, idx) => <div key={idx} className="whitespace-nowrap">{i.itemName}</div>)
                          : tx.itemName}
                      </td>
                      <td className="py-3 pr-3 text-slate-600 align-top">
                        {tx.items && tx.items.length > 0 
                          ? tx.items.map((i, idx) => <div key={idx} className="whitespace-nowrap">{i.quantity}</div>)
                          : tx.quantity}
                      </td>
                      <td className="py-3 pr-3 text-slate-600 align-top">{rupee(tx.totalAmount)}</td>
                      <td className="py-3 pr-3 text-emerald-600 font-medium align-top">{rupee(tx.paidAmount)}</td>
                      <td className="py-3 pr-3 text-rose-600 font-medium align-top">{tx.totalAmount > tx.paidAmount ? rupee(tx.totalAmount - tx.paidAmount) : '—'}</td>
                      <td className="py-3 pr-3 text-emerald-600 font-medium align-top">{tx.paidAmount > tx.totalAmount ? `+ ${rupee(tx.paidAmount - tx.totalAmount)}` : '—'}</td>
                      <td className="py-3 rounded-r-xl align-top">
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
