import React, { useState, useEffect, useRef } from 'react';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rupee  = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const num    = n => Number(n || 0).toLocaleString('en-IN');
const pctChg = (cur, prv) => prv === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prv) / prv) * 100);

const NOW = new Date();

// ─── Period definitions ───────────────────────────────────────────────────────
const PERIODS = [
  { key: 'month',   label: 'This Month',   prevLabel: 'Last Month',     months: 1  },
  { key: 'quarter', label: 'This Quarter', prevLabel: 'Last Quarter',   months: 3  },
  { key: 'half',    label: '6 Months',     prevLabel: 'Prev 6 Months',  months: 6  },
  { key: 'year',    label: 'This Year',    prevLabel: 'Last Year',      months: 12 },
  { key: 'all',     label: 'All Time',     prevLabel: 'N/A',            months: 999 },
  { key: 'custom',  label: 'Custom',       prevLabel: 'N/A',            months: 0  },
];

function getCurRange(key, customStart, customEnd) {
  if (key === 'custom') {
    const start = customStart ? new Date(customStart + 'T00:00:00') : new Date(2000, 0, 1);
    const end   = customEnd   ? new Date(customEnd   + 'T23:59:59') : new Date();
    return { start, end };
  }
  const end   = new Date();
  const start = new Date();
  if (key === 'all') { start.setFullYear(2000); }
  else {
    const p = PERIODS.find(p => p.key === key);
    start.setMonth(start.getMonth() - p.months);
    start.setDate(1); start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function getPrvRange(key, customStart, customEnd) {
  if (key === 'all' || key === 'custom') return { start: new Date(2000, 0, 1), end: new Date(2000, 0, 1) };
  const { start, end } = getCurRange(key, customStart, customEnd);
  const dur = end - start;
  return { start: new Date(start - dur), end: new Date(start) };
}

function inRange(dateStr, start, end) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function filterPeriod(arr, field, { start, end }) {
  return arr.filter(x => inRange(x[field], start, end));
}

// ─── Monthly buckets for line/bar charts ──────────────────────────────────────
function buildMonthBuckets(payments, numMonths) {
  const buckets = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    const m = d.getMonth(), y = d.getFullYear();
    const items = payments.filter(p => {
      const pd = new Date(p.createdAt);
      return pd.getMonth() === m && pd.getFullYear() === y;
    });
    const revenue = items.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0);
    buckets.push({
      label, revenue,
      count:   items.length,
      avg:     items.length ? Math.round(revenue / items.length) : 0,
      pending: items.reduce((s, p) => s + (p.balanceAmount || 0), 0),
    });
  }
  return buckets;
}

// ─── Chart.js wrapper ─────────────────────────────────────────────────────────
function ChartBox({ id, type, labels, datasets, height = 220, isDoughnut = false }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const gridColor = 'rgba(0,0,0,0.05)';
    const tickColor = '#94a3b8';

    const scales = isDoughnut ? {} : {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: {
          color: tickColor, font: { size: 11 },
          callback: v => v >= 1000 ? '₹' + (v / 1000).toFixed(0) + 'k' : String(Math.round(v)),
        },
      },
    };

    chartRef.current = new window.Chart(canvasRef.current, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: { mode: isDoughnut ? 'nearest' : 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#e2e8f0',
            bodyColor: '#94a3b8',
            padding: 10,
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y ?? ctx.parsed;
                const lbl = ctx.dataset.label || '';
                return ` ${lbl}: ${typeof v === 'number' && v > 100 ? rupee(v) : num(v)}`;
              },
            },
          },
        },
        scales,
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  // eslint-disable-next-line
  }, [id, JSON.stringify(labels), JSON.stringify(datasets), type]);

  return <div style={{ position: 'relative', height }}><canvas ref={canvasRef} /></div>;
}

// ─── Reusable components ──────────────────────────────────────────────────────
function KpiCard({ label, curVal, prvVal, isMoney = true, color }) {
  const delta   = pctChg(curVal, prvVal);
  const up      = delta >= 0;
  const display = isMoney ? rupee(curVal) : num(curVal);

  const BG = {
    green:  'bg-gradient-to-br from-emerald-500 to-green-700',
    blue:   'bg-gradient-to-br from-blue-500 to-blue-700',
    amber:  'bg-gradient-to-br from-amber-400 to-orange-500',
    red:    'bg-gradient-to-br from-red-500 to-rose-600',
    violet: 'bg-gradient-to-br from-violet-500 to-purple-700',
    slate:  'bg-gradient-to-br from-slate-600 to-slate-800',
    teal:   'bg-gradient-to-br from-teal-500 to-cyan-700',
    pink:   'bg-gradient-to-br from-pink-500 to-rose-500',
  };

  return (
    <div className={`${BG[color] || BG.slate} rounded-2xl p-4 text-white shadow-sm`}>
      <p className="text-[11px] font-semibold opacity-70 mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black leading-none">{display}</p>
      {prvVal !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${up ? 'bg-white/25' : 'bg-black/20'}`}>
            {up ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
          <span className="text-[10px] opacity-55">vs prev period · {isMoney ? rupee(prvVal) : num(prvVal)}</span>
        </div>
      )}
    </div>
  );
}

function Panel({ title, icon, children, right }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h2 className="font-bold text-slate-800 text-sm">{title}</h2>
        </div>
        {right && <div>{right}</div>}
      </div>
      {children}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {items.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-2 rounded inline-block" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function DeltaBadge({ cur, prv, isMoney = true }) {
  const d  = pctChg(cur, prv);
  const up = d >= 0;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {up ? '▲' : '▼'} {Math.abs(d)}%
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Reports() {
  const [period,      setPeriod]     = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [payments,   setPayments]   = useState([]);
  const [members,    setMembers]    = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [chartReady, setChartReady] = useState(false);
  const [tablePage,  setTablePage]  = useState(1);
  const TABLE_PER = 20;

  // load Chart.js
  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = () => setChartReady(true);
    s.onerror = () => setError('Chart.js failed to load. Check internet connection.');
    document.head.appendChild(s);
  }, []);

  // fetch data
  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const [pRes, mRes, eRes] = await Promise.allSettled([
          CustomBaseUrl.get(`/reg-payments`),
          CustomBaseUrl.get(`/fetch`),
          CustomBaseUrl.get(`/expenses`),
        ]);
        if (pRes.status === 'fulfilled') {
          const d = pRes.value.data;
          setPayments(d?.payments || d?.data || []);
        } else {
          throw new Error(pRes.reason?.response?.data?.message || 'Cannot reach payment API');
        }
        if (mRes.status === 'fulfilled') setMembers(mRes.value.data?.data || []);
        if (eRes.status === 'fulfilled') setExpenses(eRes.value.data?.data || []);
      } catch (e) {
        setError(e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  // reset table page on period change
  useEffect(() => setTablePage(1), [period]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const curRange = getCurRange(period, customStart, customEnd);
  const prvRange = getPrvRange(period, customStart, customEnd);

  const curPay = filterPeriod(payments, 'createdAt', curRange);
  const prvPay = filterPeriod(payments, 'createdAt', prvRange);

  // Revenue metrics
  const curRevenue  = curPay.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0);
  const prvRevenue  = prvPay.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0);
  const curAvg      = curPay.length ? Math.round(curRevenue / curPay.length) : 0;
  const prvAvg      = prvPay.length ? Math.round(prvRevenue / prvPay.length) : 0;
  const curPending  = curPay.reduce((s, p) => s + (p.balanceAmount || 0), 0);
  const prvPending  = prvPay.reduce((s, p) => s + (p.balanceAmount || 0), 0);
  const curCollected = curRevenue - curPending;

  // Member metrics
  const curMembers = filterPeriod(members, 'createdAt', curRange);
  const prvMembers = filterPeriod(members, 'createdAt', prvRange);
  const activeNow  = members.filter(m => new Date(m.endDate) > NOW).length;
  const expiredNow = members.length - activeNow;

  // Renewal metrics (only isRenewal === true payments)
  const curRenew    = curPay.filter(p => p.isRenewal);
  const prvRenew    = prvPay.filter(p => p.isRenewal);
  const curRenewAmt = curRenew.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0);
  const prvRenewAmt = prvRenew.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0);

  // Payment mode breakdown
  const MODES = ['cash', 'upi', 'card'];
  const modeStats = MODES.map(mode => ({
    mode,
    cur:  curPay.filter(p => p.paymentMode === mode).reduce((s, p) => s + (p.finalAmount || 0), 0),
    prv:  prvPay.filter(p => p.paymentMode === mode).reduce((s, p) => s + (p.finalAmount || 0), 0),
    cnt:  curPay.filter(p => p.paymentMode === mode).length,
  }));

  // Monthly buckets
  const numMonths = period === 'month' ? 3 : period === 'quarter' ? 4 : period === 'half' ? 6 : 12;
  const buckets   = buildMonthBuckets(payments, numMonths);

  // Top members
  const topMembersMap = {};
  curPay.forEach(p => {
    if (!p.memberName) return;
    topMembersMap[p.memberName] = (topMembersMap[p.memberName] || 0) + (p.finalAmount || 0);
  });
  const topMembers = Object.entries(topMembersMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Package breakdown
  const pkgMap = {};
  curPay.forEach(p => {
    const k = p.package || 'Other';
    if (!pkgMap[k]) pkgMap[k] = { revenue: 0, count: 0 };
    pkgMap[k].revenue += p.finalAmount || 0;
    pkgMap[k].count++;
  });
  const pkgList = Object.entries(pkgMap).sort((a, b) => b[1].revenue - a[1].revenue);

  // Expense metrics
  const curExpenses = filterPeriod(expenses, 'date', curRange);
  const prvExpenses = filterPeriod(expenses, 'date', prvRange);
  const curExpTotal = curExpenses.reduce((s, e) => s + e.amount, 0);
  const prvExpTotal = prvExpenses.reduce((s, e) => s + e.amount, 0);
  const curNetProfit = curCollected - curExpTotal;
  const prvNetProfit = (prvRevenue - prvPay.reduce((s,p)=>s+(p.balanceAmount||0),0)) - prvExpTotal;

  // Expense by category for current period
  const expByCat = {};
  curExpenses.forEach(e => {
    const cat = e.category?.name || 'Uncategorised';
    const color = e.category?.color || '#6366f1';
    if (!expByCat[cat]) expByCat[cat] = { total: 0, color };
    expByCat[cat].total += e.amount;
  });

  // Monthly expense buckets (aligned with payment buckets)
  const expBuckets = buckets.map(b => {
    const bStart = new Date(b.label + ' 01');
    const bExpenses = curExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === bStart.getMonth() && d.getFullYear() === bStart.getFullYear();
    });
    return { label: b.label, amount: bExpenses.reduce((s, e) => s + e.amount, 0) };
  });

  // Table pagination
  const totalTablePages = Math.ceil(curPay.length / TABLE_PER);
  const tableRows = [...curPay].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice((tablePage - 1) * TABLE_PER, tablePage * TABLE_PER);

  const curPeriodObj = PERIODS.find(p => p.key === period);
  const periodLabel  = curPeriodObj?.label    || '';
  const prevLabel    = curPeriodObj?.prevLabel || 'Prev Period';

  // ── Chart colours ─────────────────────────────────────────────────────────
  const C = {
    blue:    'rgba(37,99,235,0.85)',
    blueL:   'rgba(37,99,235,0.2)',
    green:   'rgba(16,185,129,0.85)',
    greenL:  'rgba(16,185,129,0.15)',
    amber:   'rgba(245,158,11,0.85)',
    amberL:  'rgba(245,158,11,0.1)',
    red:     'rgba(239,68,68,0.75)',
    violet:  'rgba(139,92,246,0.85)',
    gray:    'rgba(148,163,184,0.55)',
  };
  const PALETTE = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

  // ─── Loading / Error ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="flex flex-col items-center justify-center py-36 gap-4 text-slate-400">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold">Loading report data…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              📊 Reports & Analytics
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              {payments.length} total payments · {members.length} total members ·&nbsp;
              Showing:{' '}
              {period === 'custom'
                ? <strong className="text-slate-600">{customStart && customEnd ? `${customStart} → ${customEnd}` : 'Custom Range'}</strong>
                : <><strong className="text-slate-600">{periodLabel}</strong> vs <strong className="text-slate-600">{prevLabel}</strong></>
              }
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    period === p.key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => { setCustomStart(e.target.value); setTablePage(1); }}
                  className="text-xs text-slate-700 border-none outline-none bg-transparent cursor-pointer"
                />
                <span className="text-slate-300 text-xs">→</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => { setCustomEnd(e.target.value); setTablePage(1); }}
                  className="text-xs text-slate-700 border-none outline-none bg-transparent cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error} — Make sure the backend is running on <strong>port 5000</strong>.</span>
          </div>
        )}

        {/* ── KPI Cards: 8 across ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-2.5">
          <KpiCard label="Total Revenue"   curVal={curRevenue}       prvVal={prvRevenue}        color="green"  />
          <KpiCard label="Transactions"    curVal={curPay.length}    prvVal={prvPay.length}     color="blue"   isMoney={false} />
          <KpiCard label="Avg Payment"     curVal={curAvg}           prvVal={prvAvg}            color="amber"  />
          <KpiCard label="Pending Balance" curVal={curPending}       prvVal={prvPending}        color="red"    />
          <KpiCard label="Collected"       curVal={curCollected}     prvVal={prvRevenue - prvPay.reduce((s,p)=>s+(p.balanceAmount||0),0)} color="teal" />
          <KpiCard label="New Members"     curVal={curMembers.length} prvVal={prvMembers.length} color="violet" isMoney={false} />
          <KpiCard label="Active Members"  curVal={activeNow}        color="slate"              isMoney={false} />
          <KpiCard label="Expired"         curVal={expiredNow}       color="pink"               isMoney={false} />
        </div>

        {/* ── Renewal KPI row ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <KpiCard label="🔄 Renewal Revenue"      curVal={curRenewAmt}      prvVal={prvRenewAmt}      color="teal"   />
          <KpiCard label="🔄 Renewal Transactions"  curVal={curRenew.length}  prvVal={prvRenew.length}  color="violet" isMoney={false} />
        </div>

        {/* ── Expense & Net Profit KPI row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5">
          <KpiCard label="💸 Total Expenses"  curVal={curExpTotal}   prvVal={prvExpTotal}   color="red"    />
          <KpiCard label="💰 Net Profit"       curVal={curNetProfit}  prvVal={prvNetProfit}  color="green"  />
          <KpiCard label="📊 Expense Count"   curVal={curExpenses.length} prvVal={prvExpenses.length} color="slate" isMoney={false} />
        </div>

        {/* ── Revenue vs Expenses vs Net Profit chart ── */}
        {chartReady && (curExpTotal > 0 || curRevenue > 0) && (
          <div className="mb-4">
            <Panel title={`Revenue vs Expenses — ${periodLabel}`} icon="📉">
              <Legend items={[
                { label: 'Revenue (Collected)',  color: C.green  },
                { label: 'Expenses',             color: C.red    },
                { label: 'Net Profit',           color: C.violet },
              ]} />
              <ChartBox
                id={`rev-vs-exp-${period}`}
                type="bar"
                height={220}
                labels={buckets.map(b => b.label)}
                datasets={[
                  {
                    label: 'Revenue',
                    data: buckets.map(b => b.revenue),
                    backgroundColor: C.green,
                    borderRadius: 6,
                    order: 3,
                  },
                  {
                    label: 'Expenses',
                    data: expBuckets.map(b => b.amount),
                    backgroundColor: C.red,
                    borderRadius: 6,
                    order: 2,
                  },
                  {
                    label: 'Net Profit',
                    data: buckets.map((b, i) => b.revenue - (expBuckets[i]?.amount || 0)),
                    type: 'line',
                    borderColor: C.violet,
                    backgroundColor: 'rgba(139,92,246,0.1)',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: C.violet,
                    tension: 0.4,
                    fill: true,
                    order: 1,
                  },
                ]}
              />
            </Panel>
          </div>
        )}

        {/* ── Expense Category Breakdown ── */}
        {Object.keys(expByCat).length > 0 && (
          <div className="mb-4">
            <Panel title={`Expense by Category — ${periodLabel}`} icon="🏷️"
              right={<span className="text-xs text-slate-500 font-semibold">{rupee(curExpTotal)} total</span>}>
              {chartReady ? (
                <ChartBox
                  id={`exp-cat-${period}`}
                  type="doughnut"
                  height={220}
                  isDoughnut
                  labels={Object.keys(expByCat)}
                  datasets={[{
                    data: Object.values(expByCat).map(c => c.total),
                    backgroundColor: Object.values(expByCat).map(c => c.color),
                    borderWidth: 2,
                    borderColor: '#fff',
                  }]}
                />
              ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Loading chart…</div>}
              {/* Category list */}
              <div className="mt-3 space-y-1.5">
                {Object.entries(expByCat).sort((a,b) => b[1].total - a[1].total).map(([name, data]) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                      <span className="text-slate-600">{name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{rupee(data.total)}</span>
                      <span className="text-slate-400 w-10 text-right">
                        {curExpTotal > 0 ? Math.round((data.total / curExpTotal) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ── Revenue Trend + Transaction Count ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <Panel title={`Revenue Trend — ${periodLabel}`} icon="📈">
            {chartReady ? (
              <>
                <Legend items={[
                  { label: 'Revenue',     color: C.blue  },
                  { label: 'Avg Payment', color: C.amber },
                ]} />
                <ChartBox
                  id={`rev-trend-${period}`}
                  type="bar"
                  height={210}
                  labels={buckets.map(b => b.label)}
                  datasets={[
                    {
                      label: 'Revenue',
                      data: buckets.map(b => b.revenue),
                      backgroundColor: C.blue,
                      borderRadius: 6,
                      order: 2,
                    },
                    {
                      label: 'Avg Payment',
                      data: buckets.map(b => b.avg),
                      type: 'line',
                      borderColor: C.amber,
                      backgroundColor: C.amberL,
                      borderWidth: 2.5,
                      pointRadius: 4,
                      pointBackgroundColor: C.amber,
                      tension: 0.4,
                      fill: true,
                      order: 1,
                    },
                  ]}
                />
              </>
            ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Loading chart…</div>}
          </Panel>

          <Panel title={`Transaction Count — ${periodLabel}`} icon="🧾">
            {chartReady ? (
              <>
                <Legend items={[
                  { label: 'Transactions', color: C.green },
                  { label: 'Pending',      color: C.red   },
                ]} />
                <ChartBox
                  id={`txn-count-${period}`}
                  type="line"
                  height={210}
                  labels={buckets.map(b => b.label)}
                  datasets={[
                    {
                      label: 'Transactions',
                      data: buckets.map(b => b.count),
                      borderColor: C.green,
                      backgroundColor: C.greenL,
                      borderWidth: 2.5,
                      pointRadius: 4,
                      pointBackgroundColor: C.green,
                      tension: 0.4,
                      fill: true,
                    },
                    {
                      label: 'Pending (₹/1000)',
                      data: buckets.map(b => Math.round(b.pending / 1000)),
                      borderColor: C.red,
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      borderWidth: 2,
                      borderDash: [4, 3],
                      pointRadius: 3,
                      tension: 0.3,
                    },
                  ]}
                />
              </>
            ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Loading chart…</div>}
          </Panel>
        </div>

        {/* ── Period Comparison (current vs previous) ── */}
        <Panel title={`${periodLabel} vs ${prevLabel} — Head to Head`} icon="⚖️" right={
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Blue = {periodLabel} · Gray = {prevLabel}</span>
        }>
          {chartReady ? (
            <>
              <Legend items={[
                { label: periodLabel, color: C.blue  },
                { label: prevLabel,   color: C.gray  },
              ]} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Comparison bar chart */}
                <ChartBox
                  id={`cmp-bar-${period}`}
                  type="bar"
                  height={220}
                  labels={['Total Revenue', 'Avg Payment', 'Pending Balance', 'Transactions (×100)']}
                  datasets={[
                    {
                      label: periodLabel,
                      data: [curRevenue, curAvg, curPending, curPay.length * 100],
                      backgroundColor: C.blue,
                      borderRadius: 6,
                    },
                    {
                      label: prevLabel,
                      data: [prvRevenue, prvAvg, prvPending, prvPay.length * 100],
                      backgroundColor: C.gray,
                      borderRadius: 6,
                    },
                  ]}
                />

                {/* Delta table */}
                <div className="flex flex-col gap-2.5 justify-center">
                  {[
                    { label: 'Total Revenue',  cur: curRevenue,     prv: prvRevenue,       fmt: rupee, icon: '💰' },
                    { label: 'Avg Payment',    cur: curAvg,         prv: prvAvg,           fmt: rupee, icon: '📊' },
                    { label: 'Transactions',   cur: curPay.length,  prv: prvPay.length,    fmt: num,   icon: '🧾' },
                    { label: 'Pending',        cur: curPending,     prv: prvPending,       fmt: rupee, icon: '⏳' },
                    { label: 'New Members',    cur: curMembers.length, prv: prvMembers.length, fmt: num, icon: '👥' },
                  ].map(({ label, cur, prv, fmt: f, icon }) => {
                    const d  = pctChg(cur, prv);
                    const up = d >= 0;
                    return (
                      <div key={label} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                        <span className="text-base w-6">{icon}</span>
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-400">{label}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-slate-800">{f(cur)}</span>
                            <span className="text-[10px] text-slate-400">prev: {f(prv)}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {up ? '▲' : '▼'} {Math.abs(d)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : <div className="h-56 flex items-center justify-center text-slate-400 text-sm">Loading chart…</div>}
        </Panel>

        {/* ── Payment Mode + Collected vs Pending ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 mb-4">

          <Panel title={`Payment Mode — ${periodLabel} vs ${prevLabel}`} icon="💳">
            {chartReady ? (
              <>
                <Legend items={[
                  { label: periodLabel, color: 'rgba(37,99,235,0.85)' },
                  { label: prevLabel,   color: C.gray },
                ]} />
                <ChartBox
                  id={`mode-cmp-${period}`}
                  type="bar"
                  height={190}
                  labels={MODES.map(m => m.toUpperCase())}
                  datasets={[
                    {
                      label: periodLabel,
                      data: modeStats.map(m => m.cur),
                      backgroundColor: [C.green, C.violet, C.blue],
                      borderRadius: 6,
                    },
                    {
                      label: prevLabel,
                      data: modeStats.map(m => m.prv),
                      backgroundColor: C.gray,
                      borderRadius: 6,
                    },
                  ]}
                />
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {modeStats.map(({ mode, cur, prv, cnt }) => (
                    <div key={mode} className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-xs font-black text-slate-800">{rupee(cur)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">{mode}</p>
                      <p className="text-[10px] text-slate-400">{cnt} txns</p>
                      <DeltaBadge cur={cur} prv={prv} />
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Loading…</div>}
          </Panel>

          <Panel title={`Collected vs Pending — ${periodLabel}`} icon="💰">
            {chartReady ? (
              <>
                <Legend items={[
                  { label: 'Collected', color: C.green },
                  { label: 'Pending',   color: C.red   },
                ]} />
                <ChartBox
                  id={`coll-pie-${period}`}
                  type="doughnut"
                  height={190}
                  isDoughnut
                  labels={['Collected', 'Pending Balance']}
                  datasets={[{
                    data: [Math.max(curCollected, 0), Math.max(curPending, 0)],
                    backgroundColor: [C.green, C.red],
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverOffset: 8,
                  }]}
                />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[
                    { label: 'Collected', val: curCollected, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                    { label: 'Pending',   val: curPending,   bg: 'bg-red-50',     text: 'text-red-600'    },
                  ].map(({ label, val, bg, text }) => {
                    const total = curCollected + curPending;
                    const pctVal = total > 0 ? Math.round(val / total * 100) : 0;
                    return (
                      <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                        <p className={`text-xs font-semibold ${text} mb-0.5`}>{label}</p>
                        <p className={`font-black text-sm ${text}`}>{rupee(val)}</p>
                        <p className={`text-[10px] ${text} opacity-70`}>{pctVal}% of total</p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Loading…</div>}
          </Panel>
        </div>

        {/* ── Member Status + Top Members ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          <Panel title="Member Status" icon="👥">
            {chartReady ? (
              <>
                <Legend items={[
                  { label: `Active (${activeNow})`,  color: C.green  },
                  { label: `Expired (${expiredNow})`, color: C.red   },
                ]} />
                <ChartBox
                  id={`mem-status-${period}`}
                  type="doughnut"
                  height={190}
                  isDoughnut
                  labels={['Active', 'Expired']}
                  datasets={[{
                    data: [activeNow, expiredNow],
                    backgroundColor: [C.green, C.red],
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverOffset: 8,
                  }]}
                />
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: 'Total',       val: members.length,   cl: 'text-slate-800' },
                    { label: 'Active',      val: activeNow,        cl: 'text-emerald-600' },
                    { label: 'Expired',     val: expiredNow,       cl: 'text-red-500' },
                  ].map(({ label, val, cl }) => (
                    <div key={label} className="text-center bg-slate-50 rounded-xl py-2.5">
                      <p className={`text-xl font-black ${cl}`}>{val}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {/* New members comparison */}
                <div className="mt-3 bg-violet-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-violet-600 font-semibold">New Joins — {periodLabel}</p>
                    <p className="font-black text-violet-800">{curMembers.length} members</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-violet-400">{prevLabel}</p>
                    <p className="font-semibold text-violet-600">{prvMembers.length}</p>
                  </div>
                  <DeltaBadge cur={curMembers.length} prv={prvMembers.length} isMoney={false} />
                </div>
              </>
            ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Loading…</div>}
          </Panel>

          <Panel title={`Top Members by Revenue — ${periodLabel}`} icon="🏆">
            {topMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <span className="text-4xl mb-2">🏆</span>
                <p className="text-sm">No payment data for this period</p>
              </div>
            ) : (
              <>
                {chartReady && (
                  <ChartBox
                    id={`top-mem-${period}`}
                    type="bar"
                    height={180}
                    labels={topMembers.map(([n]) => n.split(' ')[0])}
                    datasets={[{
                      label: 'Revenue',
                      data: topMembers.map(([, v]) => v),
                      backgroundColor: PALETTE.map(c => c + 'CC'),
                      borderRadius: 6,
                    }]}
                  />
                )}
                <div className="space-y-2 mt-3">
                  {topMembers.map(([name, val], i) => {
                    const maxVal = topMembers[0][1];
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                          style={{ background: PALETTE[i] || '#64748b' }}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700 truncate">{name}</span>
                            <span className="text-xs font-black text-slate-800 ml-2 flex-shrink-0">{rupee(val)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(val / maxVal) * 100}%`, background: PALETTE[i] || '#64748b' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Panel>
        </div>

        {/* ── Package Breakdown ── */}
        {pkgList.length > 0 && (
          <Panel title={`Package Revenue — ${periodLabel}`} icon="📦">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {chartReady && (
                <ChartBox
                  id={`pkg-${period}`}
                  type="bar"
                  height={200}
                  labels={pkgList.map(([n]) => n)}
                  datasets={[{
                    label: 'Revenue',
                    data: pkgList.map(([, d]) => d.revenue),
                    backgroundColor: pkgList.map((_, i) => (PALETTE[i] || '#64748b') + 'CC'),
                    borderRadius: 6,
                  }]}
                />
              )}
              <div className="grid grid-cols-1 gap-2">
                {pkgList.map(([name, d], i) => (
                  <div key={name} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: PALETTE[i] || '#64748b' }} />
                    <span className="flex-1 text-xs font-semibold text-slate-700 truncate">{name}</span>
                    <span className="text-xs text-slate-400">{d.count} members</span>
                    <span className="text-xs font-black text-slate-800">{rupee(d.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {/* ── All Payments Table ── */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">📋 All Payments — {periodLabel}</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">{curPay.length} records · Page {tablePage} of {totalTablePages || 1}</p>
            </div>
            {totalTablePages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={tablePage === 1} onClick={() => setTablePage(p => p - 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition">
                  ‹ Prev
                </button>
                <span className="px-3 py-1.5 text-xs font-bold text-slate-700">{tablePage}</span>
                <button disabled={tablePage === totalTablePages} onClick={() => setTablePage(p => p + 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition">
                  Next ›
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#','Member','Phone','Package','Amount','Balance','Mode','Type','Date'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {curPay.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">No payments found for this period</td></tr>
                ) : tableRows.map((p, i) => (
                  <tr key={p._id || i} className={`hover:bg-slate-50 transition ${p.balanceAmount > 0 ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-3 py-2.5 text-slate-400 font-mono text-[10px]">{(tablePage - 1) * TABLE_PER + i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{p.memberName || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-400">{p.memberPhone || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{p.package || '—'}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-600 whitespace-nowrap">{rupee(p.finalAmount || p.amount)}</td>
                    <td className="px-3 py-2.5">
                      {(p.balanceAmount || 0) > 0
                        ? <span className="font-bold text-red-600">{rupee(p.balanceAmount)}</span>
                        : <span className="text-emerald-600 font-semibold">✓ Paid</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.paymentMode === 'cash'   ? 'bg-emerald-100 text-emerald-700' :
                        p.paymentMode === 'upi'    ? 'bg-violet-100 text-violet-700'  :
                        p.paymentMode === 'card'   ? 'bg-blue-100 text-blue-700'      :
                                                     'bg-slate-100 text-slate-600'}`}>
                        {p.paymentMode || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.paymentType === 'partly' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.paymentType === 'partly' ? 'Part' : 'Full'}
                        </span>
                        {p.isRenewal && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">🔄 Renew</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
