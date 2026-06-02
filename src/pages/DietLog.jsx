import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import {
  Flame, Plus, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, TrendingDown, CheckCircle, Apple,
  BarChart2, ArrowLeft,
} from 'lucide-react';

// ── Date helpers ──────────────────────────────────────────────────
const toKey = (d) => d.toISOString().slice(0, 10);
const todayKey = () => toKey(new Date());
const shiftDay = (key, n) => { const d = new Date(key + 'T00:00:00'); d.setDate(d.getDate() + n); return toKey(d); };
const last7  = (base) => Array.from({ length: 7 },  (_, i) => shiftDay(base, i - 6));
const last30 = (base) => Array.from({ length: 30 }, (_, i) => shiftDay(base, i - 29));
const fmtLabel = (key) => {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
};
const fmtFull = (key) =>
  new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// ── LocalStorage ──────────────────────────────────────────────────
const LS_LOGS = 'wfc_diet_logs';
const LS_PLAN = 'wfc_diet_plan';
const loadLogs = () => { try { return JSON.parse(localStorage.getItem(LS_LOGS) || '{}'); } catch { return {}; } };
const saveLogs = (l) => localStorage.setItem(LS_LOGS, JSON.stringify(l));
const logsForDay = (logs, key) => logs[key] || [];
const dayTotal = (logs, key) => logsForDay(logs, key).reduce((s, e) => s + (e.calories || 0), 0);

// ── Calorie ring (SVG) ────────────────────────────────────────────
const CalorieRing = ({ consumed, target }) => {
  const safe = target || 2000;
  const over = consumed > safe;
  const low  = consumed > 0 && consumed < safe * 0.5;
  const pct  = Math.min(consumed / safe, 1);
  const color = over ? '#ef4444' : low ? '#f59e0b' : consumed > 0 ? '#22c55e' : '#e2e8f0';
  const r = 52, cx = 60, cy = 60, sw = 10;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="19" fontWeight="800" fill="#1e293b">{consumed}</text>
      <text x={cx} y={cy + 9}  textAnchor="middle" fontSize="10" fill="#94a3b8">of {safe} kcal</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
        {over ? 'Over target!' : low ? 'Low intake' : consumed === 0 ? 'Start logging' : 'On track'}
      </text>
    </svg>
  );
};

// ── SVG Bar chart ─────────────────────────────────────────────────
const BarChart = ({ days, logs, target }) => {
  const vals = days.map(d => dayTotal(logs, d));
  const maxV  = Math.max(target, ...vals, 1);
  const W = 560, H = 110;
  const gap = 3, barW = Math.floor((W - 20) / days.length) - gap;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 32}`} className="w-full min-w-[320px]">
        {/* target dashed line */}
        <line
          x1="10" y1={H - (target / maxV) * H}
          x2={W - 10} y2={H - (target / maxV) * H}
          stroke="#f97316" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="14" y={H - (target / maxV) * H - 5} fontSize="8" fill="#f97316" fontWeight="600">
          Target {target}
        </text>

        {days.map((d, i) => {
          const cal  = vals[i];
          const barH = (cal / maxV) * H;
          const x    = 10 + i * (barW + gap);
          const over = cal > target;
          const low  = cal > 0 && cal < target * 0.5;
          const fill = over ? '#ef4444' : low ? '#f59e0b' : cal > 0 ? '#22c55e' : '#e2e8f0';
          return (
            <g key={d}>
              <rect x={x} y={H - barH} width={barW} height={Math.max(barH, 2)} rx="3" fill={fill} />
              <text x={x + barW / 2} y={H + 13} textAnchor="middle" fontSize={days.length > 14 ? '7' : '8'} fill="#94a3b8">
                {fmtLabel(d)}
              </text>
              {cal > 0 && (
                <text x={x + barW / 2} y={H - barH - 4} textAnchor="middle" fontSize="7" fill={fill} fontWeight="700">
                  {cal}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Meal options ──────────────────────────────────────────────────
const MEAL_OPTIONS = [
  { v: 'breakfast',    l: '🌅 Breakfast' },
  { v: 'morningSnack', l: '🍎 Morning Snack' },
  { v: 'lunch',        l: '☀️ Lunch' },
  { v: 'eveningSnack', l: '🍵 Evening Snack' },
  { v: 'dinner',       l: '🌙 Dinner' },
];
const MEAL_EMOJI = { breakfast: '🌅', morningSnack: '🍎', lunch: '☀️', eveningSnack: '🍵', dinner: '🌙' };

// ══════════════════════════════════════════════════════════════════
//  DIET LOG PAGE
// ══════════════════════════════════════════════════════════════════
const DietLog = () => {
  const navigate = useNavigate();
  const userObj  = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  const [logs,    setLogs]    = useState(loadLogs);
  const [date,    setDate]    = useState(todayKey());
  const [tab,     setTab]     = useState('today');
  const [plan,    setPlan]    = useState(null);
  const [form,    setForm]    = useState({ foodItem: '', calories: '', mealType: 'breakfast' });
  const [adding,  setAdding]  = useState(false);

  // Load calorie target from cached plan or API
  useEffect(() => {
    const cached = localStorage.getItem(LS_PLAN);
    if (cached) { try { setPlan(JSON.parse(cached)); } catch {} }

    const fetchPlan = async () => {
      try {
        let regId = userObj.registrationId;
        if (!regId && userObj.phone) {
          const r = await CustomBaseUrl.get('/fetch');
          const m = (r.data?.data || []).find(x => x.phone === userObj.phone);
          regId = m?._id;
        }
        if (!regId) return;
        const r = await CustomBaseUrl.get(`/reg-diet-plans/member/${regId}`);
        if (r.data?.success && r.data.plan) {
          setPlan(r.data.plan);
          localStorage.setItem(LS_PLAN, JSON.stringify(r.data.plan));
        }
      } catch {}
    };
    fetchPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const target  = plan?.calorieTarget || 2000;
  const entries = logsForDay(logs, date);
  const consumed = entries.reduce((s, e) => s + (e.calories || 0), 0);
  const over     = consumed > target;
  const low      = consumed > 0 && consumed < target * 0.5;
  const remaining = target - consumed;

  const base7  = useMemo(() => last7(todayKey()),  []);
  const base30 = useMemo(() => last30(todayKey()), []);

  const addEntry = () => {
    const cal = parseInt(form.calories);
    if (!form.foodItem.trim() || isNaN(cal) || cal <= 0) return;
    const entry = {
      id: Date.now().toString(),
      foodItem: form.foodItem.trim(),
      calories: cal,
      mealType: form.mealType,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = { ...logs, [date]: [...entries, entry] };
    setLogs(updated);
    saveLogs(updated);
    setForm(f => ({ ...f, foodItem: '', calories: '' }));
    setAdding(false);
  };

  const removeEntry = (id) => {
    const updated = { ...logs, [date]: entries.filter(e => e.id !== id) };
    setLogs(updated);
    saveLogs(updated);
  };

  const weekStats = useMemo(() => {
    const cals = base7.map(d => dayTotal(logs, d));
    const logged = cals.filter(c => c > 0);
    return {
      avg:     logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0,
      over:    cals.filter(c => c > target).length,
      low:     cals.filter(c => c > 0 && c < target * 0.5).length,
      logged:  logged.length,
    };
  }, [logs, base7, target]);

  const monthStats = useMemo(() => {
    const cals = base30.map(d => dayTotal(logs, d));
    const logged = cals.filter(c => c > 0);
    return {
      avg:    logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0,
      over:   cals.filter(c => c > target).length,
      low:    cals.filter(c => c > 0 && c < target * 0.5).length,
      logged: logged.length,
    };
  }, [logs, base30, target]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Flame size={20} className="text-orange-500" /> Calorie Tracker
            </h1>
            <p className="text-xs text-slate-400">
              Target: <span className="font-bold text-orange-600">{target} kcal/day</span>
              {plan?.goal && <span className="ml-2 text-slate-400">· {plan.goal}</span>}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border border-slate-200 rounded-2xl p-1 mb-5 shadow-sm">
          {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${tab === v ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── TODAY TAB ── */}
        {tab === 'today' && (<>

          {/* Date navigator */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
            <button onClick={() => setDate(d => shiftDay(d, -1))}
              className="p-1.5 rounded-xl hover:bg-slate-100 transition">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <div className="text-center">
              <p className="font-bold text-slate-900 text-sm">{date === todayKey() ? 'Today' : date}</p>
              <p className="text-xs text-slate-400">{fmtFull(date)}</p>
            </div>
            <button onClick={() => setDate(d => shiftDay(d, 1))} disabled={date >= todayKey()}
              className="p-1.5 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition">
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          {/* Calorie ring + status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4 flex items-center gap-5">
            <div className="shrink-0">
              <CalorieRing consumed={consumed} target={target} />
            </div>
            <div className="flex-1 space-y-2.5">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Progress</span>
                  <span className="font-bold text-slate-800">{consumed} / {target} kcal</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${over ? 'bg-red-500' : low ? 'bg-amber-400' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((consumed / target) * 100, 100)}%` }} />
                </div>
              </div>

              {over && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={13} className="text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-700">
                    {consumed - target} kcal over your daily target! Consider lighter meals.
                  </p>
                </div>
              )}
              {low && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <TrendingDown size={13} className="text-amber-500 shrink-0" />
                  <p className="text-xs font-semibold text-amber-700">
                    Calorie intake is low — make sure you're eating enough.
                  </p>
                </div>
              )}
              {!over && !low && consumed > 0 && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <CheckCircle size={13} className="text-green-500 shrink-0" />
                  <p className="text-xs font-semibold text-green-700">
                    {remaining} kcal remaining today — keep it up!
                  </p>
                </div>
              )}
              {consumed === 0 && (
                <p className="text-xs text-slate-400 italic">No food logged yet for this day.</p>
              )}
            </div>
          </div>

          {/* Add food button / form */}
          {adding ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Add Food Item</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={form.foodItem}
                    onChange={e => setForm(f => ({ ...f, foodItem: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addEntry()}
                    placeholder="Food name (e.g. Oats, Dal, Chicken)"
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <input
                    type="number"
                    value={form.calories}
                    onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addEntry()}
                    placeholder="kcal"
                    min="1"
                    className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-center" />
                </div>
                <select
                  value={form.mealType}
                  onChange={e => setForm(f => ({ ...f, mealType: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  {MEAL_OPTIONS.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setAdding(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button onClick={addEntry}
                    disabled={!form.foodItem.trim() || !form.calories}
                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition disabled:opacity-40 flex items-center justify-center gap-1.5">
                    <Plus size={15} /> Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="w-full mb-4 py-3 bg-orange-500 text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition shadow-sm flex items-center justify-center gap-2">
              <Plus size={16} /> Log Food Item
            </button>
          )}

          {/* Food list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Food Log</p>
              <span className="text-xs text-slate-400">{entries.length} item{entries.length !== 1 ? 's' : ''}</span>
            </div>

            {entries.length === 0 ? (
              <div className="py-14 text-center">
                <Apple size={36} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-semibold text-slate-400">Nothing logged yet</p>
                <p className="text-xs text-slate-300 mt-1">Tap "Log Food Item" to start tracking</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {entries.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg leading-none shrink-0">{MEAL_EMOJI[e.mealType] || '🍽️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{e.foodItem}</p>
                      <p className="text-[10px] text-slate-400">
                        {e.mealType.replace(/([A-Z])/g, ' $1').trim()} · {e.time}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-orange-600 shrink-0">{e.calories} kcal</span>
                    <button onClick={() => removeEntry(e.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center px-4 py-3 bg-slate-50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                  <span className={`text-sm font-black ${over ? 'text-red-600' : 'text-orange-600'}`}>
                    {consumed} kcal
                  </span>
                </div>
              </div>
            )}
          </div>
        </>)}

        {/* ── WEEK TAB ── */}
        {tab === 'week' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BarChart2 size={15} className="text-orange-500" /> Last 7 Days
                </p>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />On track</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Over</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">Orange dashed line = daily target ({target} kcal)</p>
              <BarChart days={base7} logs={logs} target={target} />
            </div>

            {/* Week summary stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Days Logged',  value: weekStats.logged,         unit: 'of 7',   color: 'text-blue-600',   bg: 'bg-blue-50' },
                { label: 'Avg Daily',    value: `${weekStats.avg}`,       unit: 'kcal',   color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Over Target',  value: weekStats.over,           unit: 'days',   color: 'text-red-600',    bg: 'bg-red-50' },
                { label: 'Low Days',     value: weekStats.low,            unit: 'days',   color: 'text-amber-600',  bg: 'bg-amber-50' },
              ].map(({ label, value, unit, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
                  <p className={`text-2xl font-black ${color}`}>{value} <span className="text-sm font-bold">{unit}</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {weekStats.over > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertTriangle size={15} className="text-red-500 shrink-0" />
                <p className="text-xs font-semibold text-red-700">
                  You exceeded your calorie target on {weekStats.over} day{weekStats.over > 1 ? 's' : ''} this week.
                </p>
              </div>
            )}
            {weekStats.low > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <TrendingDown size={15} className="text-amber-500 shrink-0" />
                <p className="text-xs font-semibold text-amber-700">
                  Calorie intake was low on {weekStats.low} day{weekStats.low > 1 ? 's' : ''} this week.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── MONTH TAB ── */}
        {tab === 'month' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BarChart2 size={15} className="text-orange-500" /> Last 30 Days
                </p>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />On track</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Over</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">Orange dashed line = daily target ({target} kcal)</p>
              <BarChart days={base30} logs={logs} target={target} />
            </div>

            {/* Month summary */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Days Logged', value: monthStats.logged,       unit: 'of 30',  color: 'text-blue-600',   bg: 'bg-blue-50' },
                { label: 'Avg Daily',   value: `${monthStats.avg}`,     unit: 'kcal',   color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Over Target', value: monthStats.over,         unit: 'days',   color: 'text-red-600',    bg: 'bg-red-50' },
                { label: 'Low Days',    value: monthStats.low,          unit: 'days',   color: 'text-amber-600',  bg: 'bg-amber-50' },
              ].map(({ label, value, unit, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
                  <p className={`text-2xl font-black ${color}`}>{value} <span className="text-sm font-bold">{unit}</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {monthStats.over > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertTriangle size={15} className="text-red-500 shrink-0" />
                <p className="text-xs font-semibold text-red-700">
                  You exceeded your calorie target on {monthStats.over} day{monthStats.over > 1 ? 's' : ''} this month.
                </p>
              </div>
            )}
            {monthStats.low > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <TrendingDown size={15} className="text-amber-500 shrink-0" />
                <p className="text-xs font-semibold text-amber-700">
                  Calorie intake was low on {monthStats.low} day{monthStats.low > 1 ? 's' : ''} this month.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DietLog;
