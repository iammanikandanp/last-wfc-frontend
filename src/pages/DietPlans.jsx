import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import {
  Plus, Search, X, Flame, Droplets, Target,
  Apple, Trash2, Edit3, ChevronLeft, ChevronRight,
  Download, RefreshCw, ExternalLink, FileSpreadsheet,
  CheckCircle, AlertTriangle, BarChart2
} from 'lucide-react';

const PER_PAGE = 10;

const GOAL_COLORS = {
  'Weight Loss':  { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200' },
  'Muscle Gain':  { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    border: 'border-red-200' },
  'Maintenance':  { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200' },
  'Endurance':    { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200' },
  'Custom':       { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-200' },
};

const MEALS = [
  { key: 'breakfast',   emoji: '🌅', label: 'Breakfast' },
  { key: 'morningSnack',emoji: '🍎', label: 'Morning Snack' },
  { key: 'lunch',       emoji: '☀️', label: 'Lunch' },
  { key: 'eveningSnack',emoji: '🍵', label: 'Evening Snack' },
  { key: 'dinner',      emoji: '🌙', label: 'Dinner' },
];

const DIET_HEADERS = [
  'goal','calorieTarget','weightGoal','waterIntake','protein','carbs','fats','fiber','supplements','notes',
  'breakfast_items','breakfast_calories','breakfast_time','breakfast_notes',
  'morningSnack_items','morningSnack_calories','morningSnack_time','morningSnack_notes',
  'lunch_items','lunch_calories','lunch_time','lunch_notes',
  'eveningSnack_items','eveningSnack_calories','eveningSnack_time','eveningSnack_notes',
  'dinner_items','dinner_calories','dinner_time','dinner_notes',
];

const planToCSVRow = (plan) => [
  plan.goal || '',
  plan.calorieTarget || 0,
  plan.weightGoal || '',
  plan.waterIntake || 3,
  plan.protein || 0,
  plan.carbs || 0,
  plan.fats || 0,
  plan.fiber || 0,
  (plan.supplements || []).join(';'),
  plan.notes || '',
  ...MEALS.flatMap(({ key }) => [
    (plan[key]?.items || []).join(';'),
    plan[key]?.calories || 0,
    plan[key]?.time || '',
    plan[key]?.notes || '',
  ]),
];

const downloadPlanCSV = (plan, memberName) => {
  const csv = [DIET_HEADERS.join(','), planToCSVRow(plan).join(',')].join('\n');
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `diet_plan_${(memberName || 'member').replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

// ── Macro ring ────────────────────────────────────────────────
const MacroRing = ({ protein = 0, carbs = 0, fats = 0 }) => {
  const total = protein + carbs + fats || 1;
  const r = 22, cx = 26, cy = 26, stroke = 6;
  const circ = 2 * Math.PI * r;
  const pDash = (protein / total) * circ, cDash = (carbs / total) * circ, fDash = (fats / total) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {protein > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3b82f6" strokeWidth={stroke}
        strokeDasharray={`${pDash} ${circ - pDash}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />}
      {carbs > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={stroke}
        strokeDasharray={`${cDash} ${circ - cDash}`} strokeDashoffset={-pDash + circ / 4}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />}
      {fats > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={stroke}
        strokeDasharray={`${fDash} ${circ - fDash}`} strokeDashoffset={-(pDash + cDash) + circ / 4}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#475569">
        {Math.round(total)}g
      </text>
    </svg>
  );
};

// ── Admin plan card ───────────────────────────────────────────
const DietPlanCard = ({ plan, onEdit, onDelete }) => {
  const goal = plan.goal || 'Maintenance';
  const gc = GOAL_COLORS[goal] || GOAL_COLORS['Custom'];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div className={`h-1 ${gc.dot}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
              {plan.memberName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{plan.memberName || '—'}</p>
              <p className="text-xs text-slate-400">{plan.memberPhone || '—'}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gc.bg} ${gc.text} border ${gc.border}`}>{goal}</span>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-xl">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-700">{plan.calorieTarget || 0} kcal</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl">
            <Droplets size={14} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-700">{plan.waterIntake || 3}L water</span>
          </div>
          {plan.weightGoal && (
            <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl">
              <Target size={14} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">{plan.weightGoal} kg</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1 mb-4">
          {[
            { label: '🌅 Break', meal: plan.breakfast },
            { label: '🍎 AM',    meal: plan.morningSnack },
            { label: '☀️ Lunch', meal: plan.lunch },
            { label: '🍵 PM',    meal: plan.eveningSnack },
            { label: '🌙 Din',   meal: plan.dinner },
          ].map(({ label, meal }) => (
            <div key={label} className="text-center">
              <div className={`rounded-lg py-1 px-1 text-[10px] font-semibold ${meal?.items?.length > 0 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {label}
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">{meal?.calories || 0} cal</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
          <MacroRing protein={plan.protein} carbs={plan.carbs} fats={plan.fats} />
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" /><span className="text-[10px] text-slate-500">Protein <strong className="text-slate-800">{plan.protein || 0}g</strong></span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" /><span className="text-[10px] text-slate-500">Carbs <strong className="text-slate-800">{plan.carbs || 0}g</strong></span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" /><span className="text-[10px] text-slate-500">Fats <strong className="text-slate-800">{plan.fats || 0}g</strong></span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" /><span className="text-[10px] text-slate-500">Fiber <strong className="text-slate-800">{plan.fiber || 0}g</strong></span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(plan)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition">
            <Edit3 size={13} /> Edit Plan
          </button>
          <button onClick={() => onDelete(plan._id)}
            className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Pagination = ({ page, totalPages, filteredCount, onPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-xs text-slate-400">Showing {Math.min((page-1)*PER_PAGE+1, filteredCount)}–{Math.min(page*PER_PAGE, filteredCount)} of {filteredCount}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(p => Math.max(1, p-1))} disabled={page===1}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-white transition">
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
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${page===n ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-white bg-slate-50'}`}>
                {n}
              </button>
          )}
        <button onClick={() => onPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-white transition">
          <ChevronRight size={14} className="text-slate-600"/>
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  MEMBER DIET PAGE
// ══════════════════════════════════════════════════════════════
const MemberDietPage = ({ userObj }) => {
  const navigate    = useNavigate();
  const [plan,      setPlan]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [expanded,  setExpanded]  = useState({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPlan(); }, []);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      let regId = userObj.registrationId || null;
      if (!regId && userObj.phone) {
        const allRes = await CustomBaseUrl.get(`/fetch`);
        const matched = (allRes.data?.data || []).find(m => m.phone === userObj.phone);
        regId = matched?._id || null;
      }
      if (!regId) { setNotLinked(true); setLoading(false); return; }

      const res = await CustomBaseUrl.get(`/reg-diet-plans/member/${regId}`);
      if (res.data?.success) setPlan(res.data.plan);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleMeal = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const totalMealCal = plan ? MEALS.reduce((s, { key }) => s + (plan[key]?.calories || 0), 0) : 0;
  const gc = plan ? (GOAL_COLORS[plan.goal] || GOAL_COLORS['Custom']) : null;

  // ── Stats ──
  const stats = [
    { label: 'Active Plans',   value: plan ? '1' : '0',                         icon: Apple,    color: 'text-green-600 bg-green-50' },
    { label: 'Avg Calories',   value: plan ? `${plan.calorieTarget || 0} kcal` : '—', icon: Flame, color: 'text-orange-600 bg-orange-50' },
    { label: 'Unique Goals',   value: plan ? plan.goal || 'Maintenance' : '—',  icon: Target,   color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Apple size={24} className="text-green-500" /> My Diet Plan
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Your personal nutrition plan assigned by your trainer</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/diet-log')}
              className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-orange-600 transition shadow-sm">
              <BarChart2 size={13} /> Track Calories
            </button>
            <button onClick={fetchPlan} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(({ label, value, icon: Ic, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Ic size={20} /></div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-bold text-slate-900 truncate max-w-[140px]">{loading ? '…' : value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100"/>)}
          </div>

        ) : notLinked ? (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-10 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400"/>
            <p className="font-bold text-slate-800 mb-1">Profile not linked</p>
            <p className="text-xs text-slate-500">Ask your admin to register you with phone <strong>{userObj.phone}</strong>.</p>
          </div>

        ) : !plan ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <Apple size={48} className="mx-auto mb-3 opacity-20 text-green-500"/>
            <p className="font-semibold text-slate-700">No diet plan assigned yet</p>
            <p className="text-sm text-slate-400 mt-1">Your trainer will assign a plan shortly.</p>
          </div>

        ) : (
          <>
            {/* ── Excel / CSV source banner ── */}
            {plan.gsheetLink && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
                <FileSpreadsheet size={18} className="text-emerald-600 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-800">Linked from Google Sheet</p>
                  <p className="text-[10px] text-emerald-600 truncate">{plan.gsheetLink}</p>
                </div>
                <a href={plan.gsheetLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-emerald-700 transition shrink-0">
                  <ExternalLink size={11}/> Open Sheet
                </a>
              </div>
            )}

            {/* ── Main plan card ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Card header */}
              <div className={`h-1.5 ${gc.dot}`}/>
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${gc.bg} ${gc.text} border ${gc.border}`}>
                    {plan.goal || 'Maintenance'}
                  </span>
                  <button onClick={() => downloadPlanCSV(plan, plan.memberName)}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-700 transition shadow-sm">
                    <Download size={13}/> Download Excel
                  </button>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label:'Calorie Target', value:`${plan.calorieTarget || 0} kcal`, icon:<Flame size={16} className="text-orange-500"/>, bg:'bg-orange-50' },
                    { label:'Water Intake',   value:`${plan.waterIntake || 3} L/day`,  icon:<Droplets size={16} className="text-blue-500"/>,   bg:'bg-blue-50' },
                    { label:'Weight Goal',    value: plan.weightGoal ? `${plan.weightGoal} kg` : 'Not set', icon:<Target size={16} className="text-emerald-500"/>, bg:'bg-emerald-50' },
                  ].map(({ label, value, icon, bg }) => (
                    <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                      <div className="flex justify-center mb-1">{icon}</div>
                      <p className="text-sm font-black text-slate-800">{value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Macros */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <MacroRing protein={plan.protein} carbs={plan.carbs} fats={plan.fats}/>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1">
                    {[
                      { label:'Protein', val:plan.protein, color:'bg-blue-500' },
                      { label:'Carbs',   val:plan.carbs,   color:'bg-amber-500' },
                      { label:'Fats',    val:plan.fats,    color:'bg-red-500' },
                      { label:'Fiber',   val:plan.fiber,   color:'bg-green-500' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color} shrink-0`}/>
                        <span className="text-[11px] text-slate-500">{label} <strong className="text-slate-800">{val || 0}g</strong></span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-700">{totalMealCal} cal</p>
                    <p className="text-[9px] text-slate-400">total/day</p>
                  </div>
                </div>

                {/* Supplements */}
                {plan.supplements?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Supplements</p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.supplements.map((s, i) => (
                        <span key={i} className="px-2.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[11px] font-semibold">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {plan.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-3 bg-slate-50 rounded-xl px-3 py-2">📝 {plan.notes}</p>
                )}
              </div>

              {/* ── Meal breakdown ── */}
              <div className="p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Meal Breakdown</p>
                <div className="space-y-2">
                  {MEALS.map(({ key, emoji, label }) => {
                    const meal = plan[key];
                    const hasItems = meal?.items?.length > 0;
                    const isOpen  = expanded[key];
                    return (
                      <div key={key} className={`rounded-xl border overflow-hidden transition-all ${hasItems ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
                        <button
                          onClick={() => hasItems && toggleMeal(key)}
                          className={`w-full flex items-center justify-between px-4 py-3 ${hasItems ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg leading-none">{emoji}</span>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-800">{label}</p>
                              {meal?.time && <p className="text-[10px] text-slate-400">{meal.time}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasItems
                              ? <><span className="text-xs font-bold text-orange-600">{meal.calories} cal</span>
                                  <CheckCircle size={14} className="text-emerald-500"/>
                                  <span className="text-[10px] text-slate-400">{isOpen ? '▲' : '▼'}</span></>
                              : <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Not set</span>
                            }
                          </div>
                        </button>
                        {isOpen && hasItems && (
                          <div className="px-4 pb-3 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {meal.items.map((item, i) => (
                                <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[11px] text-slate-700 font-medium">{item}</span>
                              ))}
                            </div>
                            {meal.notes && <p className="text-[10px] text-slate-400 italic mt-2">💬 {meal.notes}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Download footer ── */}
              <div className="px-5 pb-5">
                <button onClick={() => downloadPlanCSV(plan, plan.memberName)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition shadow-sm">
                  <FileSpreadsheet size={16}/> Download Diet Plan as Excel (CSV)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  ADMIN DIET PAGE
// ══════════════════════════════════════════════════════════════
const AdminDietPage = () => {
  const navigate  = useNavigate();
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  useEffect(() => { fetchPlans(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const fetchPlans = async () => {
    try {
      const res = await CustomBaseUrl.get(`/reg-diet-plans`);
      if (res.data.success) setPlans(res.data.plans);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this diet plan?')) return;
    try {
      await CustomBaseUrl.delete(`/reg-diet-plans/${id}`);
      setPlans(p => p.filter(x => x._id !== id));
    } catch (e) { alert('Delete failed'); }
  };

  const handleEdit = (plan) => navigate('/diet-plans/new', { state: { editPlan: plan } });

  const filtered    = plans.filter(p =>
    p.memberName?.toLowerCase().includes(search.toLowerCase()) ||
    p.goal?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const stats = {
    total:       plans.length,
    avgCalories: plans.length ? Math.round(plans.reduce((s, p) => s + (p.calorieTarget || 0), 0) / plans.length) : 0,
    goals:       [...new Set(plans.map(p => p.goal))].length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Apple size={24} className="text-green-500" /> Diet Plans
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage member nutrition plans</p>
          </div>
          <button onClick={() => navigate('/diet-plans/new')}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all font-semibold text-sm shadow-sm">
            <Plus size={16} /> New Diet Plan
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label:'Active Plans', value:stats.total,                    icon:Apple,  color:'text-green-600 bg-green-50' },
            { label:'Avg Calories', value:`${stats.avgCalories} kcal`,    icon:Flame,  color:'text-orange-600 bg-orange-50' },
            { label:'Unique Goals', value:stats.goals,                    icon:Target, color:'text-violet-600 bg-violet-50' },
          ].map(({ label, value, icon: Ic, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Ic size={20} /></div>
              <div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900">{value}</p></div>
            </div>
          ))}
        </div>

        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by member name or goal…"
            className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse h-64">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/3 mb-6" />
                <div className="h-16 bg-slate-100 rounded mb-3" />
                <div className="h-10 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Apple size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold">No diet plans yet</p>
            <p className="text-sm mt-1">Create the first one for your members</p>
            <button onClick={() => navigate('/diet-plans/new')}
              className="mt-4 bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition">
              Create Diet Plan
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length} plans</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map(plan => (
                <DietPlanCard key={plan._id} plan={plan} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} filteredCount={filtered.length} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  ROUTER — picks admin or member view
// ══════════════════════════════════════════════════════════════
const DietPlans = () => {
  const userObj = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  if (userObj.role === 'member') return <MemberDietPage userObj={userObj} />;
  return <AdminDietPage />;
};

export default DietPlans;
