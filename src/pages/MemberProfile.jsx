import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import {
  ArrowLeft, Edit3, Heart, Activity, Calendar, CreditCard,
  Apple, Upload, X, Check, Scale, Plus,
  Phone, Mail, MapPin, User, RefreshCw, Download,
  Flame, Droplets, Target, Dumbbell, Sun, Moon,
  ChevronDown, ChevronUp, Trash2, ExternalLink, ShieldOff, Star,
} from 'lucide-react';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_LABELS = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat' };
const DAY_FULL   = { monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday',saturday:'Saturday' };

const MONTH_LABELS = {
  '2025-09':'Sep 25','2025-10':'Oct 25','2025-11':'Nov 25','2025-12':'Dec 25',
  '2026-01':'Jan 26','2026-02':'Feb 26','2026-03':'Mar 26','2026-04':'Apr 26','2026-05':'May 26',
};

// ── Parse CSV ─────────────────────────────────────────────────────────────────
const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ''; });
    return obj;
  });
};

// ── CSV rows → workout payload (matches WorkoutPlan model exactly) ────────────
// CSV columns: goal, notes, day, session, exercise_name, sets, reps,
//              duration, rest, calories, exercise_notes
const csvRowsToWorkoutPayload = (rows, registrationId) => {
  const days = { monday:{morning:{exercises:[],totalCalories:0},evening:{exercises:[],totalCalories:0}},
                 tuesday:{morning:{exercises:[],totalCalories:0},evening:{exercises:[],totalCalories:0}},
                 wednesday:{morning:{exercises:[],totalCalories:0},evening:{exercises:[],totalCalories:0}},
                 thursday:{morning:{exercises:[],totalCalories:0},evening:{exercises:[],totalCalories:0}},
                 friday:{morning:{exercises:[],totalCalories:0},evening:{exercises:[],totalCalories:0}},
                 saturday:{morning:{exercises:[],totalCalories:0},evening:{exercises:[],totalCalories:0}} };

  const meta = { goal: rows[0]?.goal || 'Muscle Gain', notes: rows[0]?.notes || '' };

  rows.forEach(row => {
    const day     = (row.day     || '').toLowerCase().trim();
    const session = (row.session || '').toLowerCase().trim(); // 'morning' | 'evening'
    if (!days[day] || !days[day][session]) return;

    const exercise = {
      name:     row.exercise_name || '',
      sets:     parseInt(row.sets)     || 0,
      reps:     row.reps               || '',
      duration: row.duration           || '',
      rest:     row.rest               || '',
      calories: parseInt(row.calories) || 0,
      notes:    row.exercise_notes     || '',
    };

    days[day][session].exercises.push(exercise);
    days[day][session].totalCalories += exercise.calories;
  });

  const totalWeeklyCalories = DAYS.reduce((sum, d) =>
    sum + (days[d].morning.totalCalories || 0) + (days[d].evening.totalCalories || 0), 0);

  return { registrationId, ...meta, ...days, totalWeeklyCalories };
};

// ── Diet CSV parser (unchanged) ───────────────────────────────────────────────
const csvRowToDietPayload = (row, registrationId) => {
  const parseMeal = (prefix) => ({
    items:    (row[`${prefix}_items`]    || '').split(';').map(s => s.trim()).filter(Boolean),
    calories: parseInt(row[`${prefix}_calories`]) || 0,
    time:     row[`${prefix}_time`]     || '',
    notes:    row[`${prefix}_notes`]    || '',
  });
  return {
    registrationId,
    goal:          row.goal || 'Maintenance',
    calorieTarget: parseInt(row.calorieTarget) || 2000,
    weightGoal:    row.weightGoal ? parseFloat(row.weightGoal) : undefined,
    waterIntake:   parseFloat(row.waterIntake) || 3,
    protein: parseInt(row.protein) || 0,
    carbs:   parseInt(row.carbs)   || 0,
    fats:    parseInt(row.fats)    || 0,
    fiber:   parseInt(row.fiber)   || 0,
    supplements: (row.supplements || '').split(';').map(s => s.trim()).filter(Boolean),
    notes:   row.notes || '',
    breakfast:    parseMeal('breakfast'),
    morningSnack: parseMeal('morningSnack'),
    lunch:        parseMeal('lunch'),
    eveningSnack: parseMeal('eveningSnack'),
    dinner:       parseMeal('dinner'),
  };
};

// ── Download helpers ──────────────────────────────────────────────────────────
const DIET_HEADERS = ['goal','calorieTarget','weightGoal','waterIntake','protein','carbs','fats','fiber','supplements','notes','breakfast_items','breakfast_calories','breakfast_time','breakfast_notes','morningSnack_items','morningSnack_calories','morningSnack_time','morningSnack_notes','lunch_items','lunch_calories','lunch_time','lunch_notes','eveningSnack_items','eveningSnack_calories','eveningSnack_time','eveningSnack_notes','dinner_items','dinner_calories','dinner_time','dinner_notes'];
const DIET_EXAMPLE = ['Weight Loss','2000','70','3','150','200','60','25','Whey;Multivitamin','Stay consistent','Oats;Boiled Eggs;Banana','450','08:00','High protein','Apple;Almonds','150','10:30','Light snack','Brown Rice;Dal;Grilled Chicken','650','13:00','Main meal','Boiled Egg;Cucumber','100','16:30','Pre-workout','Chapati;Paneer;Curd','450','20:00','Light dinner'];

const WORKOUT_HEADERS = ['goal','notes','day','session','exercise_name','sets','reps','duration','rest','calories','exercise_notes'];

const downloadCSV = (headers, rows, filename) => {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download= filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

const downloadDietTemplate    = () => downloadCSV(DIET_HEADERS, [DIET_EXAMPLE], 'diet_plan_template.csv');
const downloadWorkoutTemplate = () => downloadCSV(WORKOUT_HEADERS, [
  ['Muscle Gain','Progressive overload','monday','morning','Bench Press','4','10-12','45 sec','60 sec','80','Keep back flat'],
  ['Muscle Gain','Progressive overload','monday','morning','Incline Press','3','12','40 sec','60 sec','60','Control descent'],
  ['Muscle Gain','Progressive overload','monday','evening','Tricep Pushdown','3','12','30 sec','45 sec','35','Elbows fixed'],
  ['Muscle Gain','Progressive overload','tuesday','morning','Squats','4','10','60 sec','90 sec','100','Knees over toes'],
  ['Muscle Gain','Progressive overload','tuesday','evening','Leg Curl','3','12','30 sec','45 sec','50','Slow eccentric'],
  ['Muscle Gain','Progressive overload','wednesday','morning','Pull-ups','4','8-10','45 sec','90 sec','70','Dead hang start'],
  ['Muscle Gain','Progressive overload','wednesday','evening','Bicep Curl','3','12','30 sec','45 sec','40','No swinging'],
  ['Muscle Gain','Progressive overload','thursday','morning','Overhead Press','4','10','45 sec','60 sec','70','Core braced'],
  ['Muscle Gain','Progressive overload','friday','morning','Deadlift','4','8','60 sec','120 sec','120','Neutral spine'],
  ['Muscle Gain','Progressive overload','saturday','morning','Treadmill','1','','30 min','','200','Moderate pace'],
  ['Muscle Gain','Progressive overload','saturday','evening','Stretching','1','','20 min','','50','Full body'],
], 'workout_plan_template.csv');

// ── Status helper ─────────────────────────────────────────────────────────────
const getStatus = (endDate) => {
  if (!endDate) return { label:'Unknown', color:'bg-slate-100 text-slate-500', dot:'bg-slate-400' };
  const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000);
  if (diff < 0)  return { label:'Expired',      color:'bg-red-100 text-red-700',     dot:'bg-red-500' };
  if (diff <= 7) return { label:`${diff}d left`, color:'bg-amber-100 text-amber-700', dot:'bg-amber-500' };
  return            { label:'Active',        color:'bg-emerald-100 text-emerald-700', dot:'bg-emerald-500' };
};

// ── Ring chart ────────────────────────────────────────────────────────────────
const Ring = ({ pct, size = 60 }) => {
  const r = (size - 10) / 2, circ = 2 * Math.PI * r;
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626';
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"/>
    </svg>
  );
};

const MiniLineChart = ({ points = [], color = '#3b82f6', unit = '' }) => {
  const filtered = points.filter(p => p.y != null && !isNaN(p.y));
  if (!filtered.length) return <div className="text-xs text-slate-400">No data</div>;
  const W = 220, H = 60, PAD = { l: 10, r: 10, t: 6, b: 14 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const xs = filtered.map(p => p.x.getTime());
  const ys = filtered.map(p => Number(p.y));
  const loX = Math.min(...xs), hiX = Math.max(...xs);
  const loY = Math.min(...ys), hiY = Math.max(...ys);
  const xOf = (t) => PAD.l + (hiX === loX ? iW/2 : ((t - loX) / (hiX - loX)) * iW);
  const yOf = (v) => PAD.t + iH - ((v - loY) / (hiY - loY || 1)) * iH;
  const pts = filtered.map(p => [xOf(p.x.getTime()), yOf(p.y)]);
  const path = pts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r="2" fill="#fff" stroke={color} strokeWidth="1"/>))}
    </svg>
  );
};

// ── Body image tile ───────────────────────────────────────────────────────────
const BodyTile = ({ src, label }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => src && setOpen(true)}>
        {src
          ? <img src={src} alt={label} className="w-full h-24 rounded-xl object-cover border border-slate-200 hover:opacity-90 transition"/>
          : <div className="w-full h-24 rounded-xl bg-slate-100 flex items-center justify-center"><span className="text-slate-300 text-[10px]">No photo</span></div>
        }
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
      {open && <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={()=>setOpen(false)}><img src={src} alt={label} className="max-w-full max-h-full rounded-2xl"/></div>}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  DIET components
// ══════════════════════════════════════════════════════════════════════════════
const MEALS = [
  {key:'breakfast',emoji:'🌅',label:'Breakfast'},
  {key:'morningSnack',emoji:'🍎',label:'Morning Snack'},
  {key:'lunch',emoji:'☀️',label:'Lunch'},
  {key:'eveningSnack',emoji:'🍵',label:'Evening Snack'},
  {key:'dinner',emoji:'🌙',label:'Dinner'},
];
const GOAL_COLOR = {
  'Weight Loss':'bg-blue-100 text-blue-700','Muscle Gain':'bg-red-100 text-red-700',
  'Maintenance':'bg-green-100 text-green-700','Endurance':'bg-amber-100 text-amber-700',
  'Strength':'bg-orange-100 text-orange-700','Flexibility':'bg-pink-100 text-pink-700',
  'Custom':'bg-violet-100 text-violet-700',
};

const DietCard = ({ plan, onEdit, onDelete }) => {
  const [exp, setExp] = useState(false);
  const totalCal = MEALS.reduce((s,m) => s + (plan[m.key]?.calories || 0), 0);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${GOAL_COLOR[plan.goal]||'bg-slate-100 text-slate-600'}`}>{plan.goal||'Maintenance'}</span>
          <div className="flex gap-3">
            <button onClick={onEdit}   className="text-xs text-blue-600 font-semibold hover:underline">Edit</button>
            <button onClick={onDelete} className="text-xs text-red-500 font-semibold hover:underline">Delete</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-full text-[10px] font-bold"><Flame size={9}/> {plan.calorieTarget||0} kcal</span>
          <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold"><Droplets size={9}/> {plan.waterIntake||3}L</span>
          {plan.weightGoal&&<span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold"><Target size={9}/> {plan.weightGoal}kg</span>}
          <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-[10px] font-bold">{totalCal} cal/day</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[{l:'Protein',v:plan.protein,c:'bg-blue-50 text-blue-700'},{l:'Carbs',v:plan.carbs,c:'bg-amber-50 text-amber-700'},
            {l:'Fats',v:plan.fats,c:'bg-red-50 text-red-700'},{l:'Fiber',v:plan.fiber,c:'bg-green-50 text-green-700'}
          ].map(({l,v,c})=>(
            <div key={l} className={`text-center rounded-lg py-1.5 ${c}`}>
              <p className="text-sm font-black leading-none">{v||0}g</p>
              <p className="text-[9px] font-semibold opacity-70 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {MEALS.map(({key,emoji,label})=>{const meal=plan[key];const has=meal?.items?.length>0;return(
            <div key={key} className={`text-center rounded-lg py-1.5 ${has?'bg-slate-800 text-white':'bg-slate-100 text-slate-400'}`}>
              <p className="text-sm leading-none">{emoji}</p>
              <p className="text-[8px] font-bold mt-0.5">{label.split(' ')[0]}</p>
              {has&&<p className="text-[8px] opacity-60">{meal.calories}cal</p>}
            </div>
          );})}
        </div>
      </div>
      <button onClick={()=>setExp(!exp)} className="w-full px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 border-t border-slate-100 hover:bg-slate-50 transition">
        {exp?'▲ Hide meals':'▼ Show meal details'}
      </button>
      {exp&&(
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {MEALS.map(({key,emoji,label})=>{const meal=plan[key];if(!meal?.items?.length)return null;return(
            <div key={key} className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">{emoji} {label}</span>
                <div className="flex gap-2">{meal.time&&<span className="text-[10px] text-slate-400">{meal.time}</span>}<span className="text-[10px] font-bold text-orange-600">{meal.calories} cal</span></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {meal.items.map((item,i)=><span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[10px] text-slate-600">{item}</span>)}
              </div>
              {meal.notes&&<p className="text-[10px] text-slate-400 italic mt-1">{meal.notes}</p>}
            </div>
          );})}
          {plan.supplements?.length>0&&<div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Supplements</p><div className="flex flex-wrap gap-1">{plan.supplements.map((s,i)=><span key={i} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-medium">{s}</span>)}</div></div>}
          {plan.notes&&<p className="text-[10px] text-slate-500 italic">📝 {plan.notes}</p>}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  WORKOUT components
// ══════════════════════════════════════════════════════════════════════════════

// ── Single exercise row ───────────────────────────────────────────────────────
const ExerciseRow = ({ ex, index }) => (
  <div className="py-2.5 border-b border-slate-100 last:border-0">
    {/* Row 1: number + exercise name */}
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">
        {index + 1}
      </div>
      <p className="text-xs font-bold text-slate-800">{ex.name || '—'}</p>
    </div>
    {/* Row 2: badges */}
    <div className="flex items-center gap-1.5 flex-wrap pl-7 text-[10px]">
      {ex.sets > 0 && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">{ex.sets}×</span>}
      {ex.reps && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md font-bold">{ex.reps}</span>}
      {ex.duration && <span className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-md font-bold">{ex.duration}</span>}
      {ex.rest && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">rest {ex.rest}</span>}
      {ex.calories > 0 && <span className="flex items-center gap-0.5 text-orange-600 font-bold"><Flame size={8}/>{ex.calories}</span>}
    </div>
    {/* Row 3: notes */}
    {ex.notes && <p className="text-[10px] text-slate-400 italic pl-7 mt-0.5">{ex.notes}</p>}
  </div>
);

// ── Session block (morning / evening) ────────────────────────────────────────
const SessionBlock = ({ session, sessionKey, exercises, totalCalories }) => {
  const [exp, setExp] = useState(false);
  const hasEx = exercises?.length > 0;
  const Icon = sessionKey === 'morning' ? Sun : Moon;
  const color = sessionKey === 'morning'
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-indigo-50 border-indigo-200 text-indigo-700';
  const iconColor = sessionKey === 'morning' ? 'text-amber-500' : 'text-indigo-500';

  return (
    <div className={`rounded-xl border ${hasEx ? color : 'bg-slate-50 border-slate-100'} overflow-hidden`}>
      <button
        onClick={() => hasEx && setExp(!exp)}
        className={`w-full flex items-center justify-between px-3 py-2 ${hasEx ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-2">
          <Icon size={13} className={hasEx ? iconColor : 'text-slate-300'}/>
          <span className={`text-xs font-bold capitalize ${hasEx ? '' : 'text-slate-400'}`}>{session}</span>
          {hasEx && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sessionKey==='morning'?'bg-amber-100 text-amber-700':'bg-indigo-100 text-indigo-700'}`}>
              {exercises.length} exercises
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasEx && totalCalories > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-600">
              <Flame size={9}/>{totalCalories} cal
            </span>
          )}
          {hasEx && (exp ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
          {!hasEx && <span className="text-[10px] text-slate-400">Rest</span>}
        </div>
      </button>
      {exp && hasEx && (
        <div className="px-3 pb-2 bg-white/60">
          {exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} index={i}/>)}
        </div>
      )}
    </div>
  );
};

// ── Full workout dashboard card ───────────────────────────────────────────────
const WorkoutDashboard = ({ plan, onEdit, onDelete }) => {
  const [activeDay, setActiveDay] = useState('monday');

  const weekCals  = plan.totalWeeklyCalories || 0;
  const totalExer = DAYS.reduce((s, d) =>
    s + (plan[d]?.morning?.exercises?.length || 0) + (plan[d]?.evening?.exercises?.length || 0), 0);
  const activeDays = DAYS.filter(d =>
    (plan[d]?.morning?.exercises?.length || 0) + (plan[d]?.evening?.exercises?.length || 0) > 0
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${GOAL_COLOR[plan.goal]||'bg-slate-100 text-slate-600'}`}>{plan.goal}</span>
          <div className="flex gap-3">
            <button onClick={onEdit}   className="text-xs text-blue-600 font-semibold hover:underline">Edit</button>
            <button onClick={onDelete} className="text-xs text-red-500 font-semibold hover:underline">Delete</button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {label:'Weekly Cal', val:`${weekCals}`, icon:<Flame size={13} className="text-orange-500"/>, bg:'bg-orange-50'},
            {label:'Exercises',  val:totalExer,     icon:<Dumbbell size={13} className="text-slate-500"/>, bg:'bg-slate-50'},
            {label:'Active Days',val:`${activeDays}/6`, icon:<Calendar size={13} className="text-blue-500"/>, bg:'bg-blue-50'},
          ].map(({label,val,icon,bg})=>(
            <div key={label} className={`${bg} rounded-xl p-2.5 text-center`}>
              <div className="flex justify-center mb-1">{icon}</div>
              <p className="text-sm font-black text-slate-800 leading-none">{val}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Day tabs — Mon to Sat */}
      <div className="flex border-b border-slate-100 overflow-x-auto">
        {DAYS.map(day => {
          const morEx = plan[day]?.morning?.exercises?.length || 0;
          const eveEx = plan[day]?.evening?.exercises?.length || 0;
          const total = morEx + eveEx;
          const isActive = activeDay === day;
          return (
            <button key={day} onClick={()=>setActiveDay(day)}
              className={`flex-1 min-w-0 py-2.5 px-1 text-center transition-all relative ${isActive?'bg-slate-800 text-white':'hover:bg-slate-50 text-slate-500'}`}>
              <p className={`text-[11px] font-bold ${isActive?'text-white':'text-slate-600'}`}>{DAY_LABELS[day]}</p>
              {total > 0
                ? <p className={`text-[9px] font-semibold mt-0.5 ${isActive?'text-slate-300':'text-slate-400'}`}>{total} ex</p>
                : <p className={`text-[9px] mt-0.5 ${isActive?'text-slate-400':'text-slate-300'}`}>rest</p>
              }
              {/* Dot indicators */}
              <div className="flex justify-center gap-0.5 mt-0.5">
                {morEx > 0 && <span className={`w-1 h-1 rounded-full ${isActive?'bg-amber-300':'bg-amber-400'}`}/>}
                {eveEx > 0 && <span className={`w-1 h-1 rounded-full ${isActive?'bg-indigo-300':'bg-indigo-400'}`}/>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-slate-800">{DAY_FULL[activeDay]}</p>
          {/* Day calories */}
          {(() => {
            const dayCal = (plan[activeDay]?.morning?.totalCalories||0) + (plan[activeDay]?.evening?.totalCalories||0);
            return dayCal > 0 ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                <Flame size={9}/> {dayCal} cal today
              </span>
            ) : null;
          })()}
        </div>

        <SessionBlock
          session="Morning"
          sessionKey="morning"
          exercises={plan[activeDay]?.morning?.exercises || []}
          totalCalories={plan[activeDay]?.morning?.totalCalories || 0}
        />
        <SessionBlock
          session="Evening"
          sessionKey="evening"
          exercises={plan[activeDay]?.evening?.exercises || []}
          totalCalories={plan[activeDay]?.evening?.totalCalories || 0}
        />

        {plan.notes && <p className="text-[10px] text-slate-400 italic pt-1">📝 {plan.notes}</p>}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  Generic CSV Import Modal (used for both diet & workout)
// ══════════════════════════════════════════════════════════════════════════════
const CSVImportModal = ({ title, subtitle, accentColor, onImport, onClose, downloadTemplate, columnGuide, previewFn }) => {
  const [tab,      setTab]      = useState('file');
  const [preview,  setPreview]  = useState(null);
  const [rawRows,  setRawRows]  = useState(null);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [gLink,    setGLink]    = useState('');
  const [fetching, setFetching] = useState(false);

  const loadRows = (rows) => {
    setRawRows(rows);
    setPreview(previewFn(rows));
    setError('');
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        if (!rows.length) { setError('CSV is empty or has no data rows'); return; }
        loadRows(rows);
      } catch { setError('Could not parse CSV — check the format'); }
    };
    reader.readAsText(f);
  };

  const handleGSheetFetch = async () => {
    setFetching(true); setError(''); setRawRows(null); setPreview(null);
    try {
      const res = await CustomBaseUrl.get(`/proxy/gsheet-csv?url=${encodeURIComponent(gLink.trim())}`);
      const text = typeof res.data === 'string' ? res.data : '';
      if (!text) throw new Error('Empty response from sheet');
      const rows = parseCSV(text);
      if (!rows.length) throw new Error('Sheet is empty or has no data rows');
      loadRows(rows);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      setError(msg);
    }
    finally { setFetching(false); }
  };

  const handleImport = async () => {
    if (!rawRows) return;
    setSaving(true); setError('');
    try {
      await onImport(rawRows, tab === 'link' ? gLink.trim() : '');
      onClose();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const bg    = { green:'from-green-600 to-emerald-700', red:'from-red-600 to-rose-700' }[accentColor] || 'from-slate-700 to-slate-900';
  const btnBg = { green:'bg-green-600 hover:bg-green-700', red:'bg-red-600 hover:bg-red-700' }[accentColor] || 'bg-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className={`px-5 py-4 bg-gradient-to-r ${bg} text-white flex items-center justify-between flex-shrink-0`}>
          <div>
            <p className="font-bold text-sm">{title}</p>
            <p className="text-xs opacity-70">{subtitle}</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">

          {/* Download template */}
          <button onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:border-slate-400 hover:bg-slate-50 transition">
            <Download size={14}/> Download CSV Template First
          </button>

          {/* Column guide */}
          <div className="bg-slate-50 rounded-xl p-4 text-[10px] space-y-1">
            <p className="font-bold text-slate-600 text-xs mb-2">📋 CSV Columns</p>
            {columnGuide.map(([col, desc]) => (
              <div key={col} className="flex gap-2">
                <span className="font-mono text-slate-700 font-semibold shrink-0">{col}</span>
                <span className="text-slate-400">— {desc}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {['file','link'].map(t => (
              <button key={t} onClick={() => { setTab(t); setRawRows(null); setPreview(null); setError(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab===t?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                {t==='file'
                  ? <><Upload size={10} className="inline mr-1"/>Upload CSV</>
                  : <><ExternalLink size={10} className="inline mr-1"/>Google Sheet</>}
              </button>
            ))}
          </div>

          {/* File upload */}
          {tab === 'file' && (
            <label className="block cursor-pointer">
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition ${rawRows?'border-green-400 bg-green-50':'border-slate-200 hover:border-slate-400'}`}>
                <Upload size={20} className={`mx-auto mb-2 ${rawRows?'text-green-500':'text-slate-300'}`}/>
                <p className="text-sm font-semibold text-slate-600">{rawRows?`✅ ${rawRows.length} rows loaded — ready to import`:'Click to upload CSV'}</p>
                <p className="text-[10px] text-slate-400 mt-1">.csv files only</p>
              </div>
              <input type="file" accept=".csv" className="hidden" onChange={handleFile}/>
            </label>
          )}

          {/* Google Sheet */}
          {tab === 'link' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                Share your Google Sheet as <strong>"Anyone with link can view"</strong>, then paste the URL below.
              </p>
              <div className="flex gap-2">
                <input
                  value={gLink} onChange={e => setGLink(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button onClick={handleGSheetFetch} disabled={fetching || !gLink.trim()}
                  className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-semibold disabled:opacity-40 transition ${btnBg}`}>
                  {fetching ? <><RefreshCw size={12} className="animate-spin"/>Fetching…</> : <><Download size={12}/>Fetch</>}
                </button>
              </div>
              {rawRows && (
                <p className="text-[11px] text-green-600 font-semibold">✅ {rawRows.length} rows loaded — ready to import</p>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs font-bold text-emerald-700 mb-2">Preview</p>
              <div className="space-y-1">
                {preview.map(([l,v]) => (
                  <div key={l} className="flex justify-between text-[11px]">
                    <span className="text-emerald-600 shrink-0">{l}</span>
                    <span className="font-semibold text-emerald-800 text-right ml-2 truncate max-w-[220px]">{v||'—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 font-medium">{error}</div>}
        </div>

        <div className="px-5 pb-5 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button onClick={handleImport} disabled={!rawRows||saving}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition ${btnBg}`}>
            {saving?<><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving…</>:<><Check size={14}/>Import Plan</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Edit Measurements Modal ───────────────────────────────────────────────────
const MeasureField = ({ label, name, unit, value, onChange }) => (
  <div>
    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{label}</label>
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={e => onChange(name, e.target.value)}
        className="w-full pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">{unit}</span>
    </div>
  </div>
);

const calcBodyFat = (gender, height, waist, neck, hip) => {
  const h=parseFloat(height), w=parseFloat(waist), n=parseFloat(neck), hp=parseFloat(hip);
  if (!h || !w || !n || h<=0 || w<=n) return null;
  let bf = null;
  if (gender === 'Male') {
    bf = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
  } else if (gender === 'Female') {
    if (!hp || hp <= 0) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.22100 * Math.log10(h)) - 450;
  }
  if (bf === null || isNaN(bf) || bf <= 0 || bf > 60) return null;
  return bf.toFixed(1);
};

const bfCategory = (gender, bf) => {
  const v = parseFloat(bf);
  if (isNaN(v)) return null;
  if (gender === 'Male') {
    if (v < 6)  return { label: 'Essential Fat', color: 'text-blue-600' };
    if (v < 14) return { label: 'Athlete',        color: 'text-emerald-600' };
    if (v < 18) return { label: 'Fit',            color: 'text-green-600' };
    if (v < 25) return { label: 'Acceptable',     color: 'text-amber-600' };
    return             { label: 'Obese',          color: 'text-red-600' };
  }
  if (v < 14) return { label: 'Essential Fat', color: 'text-blue-600' };
  if (v < 21) return { label: 'Athlete',        color: 'text-emerald-600' };
  if (v < 25) return { label: 'Fit',            color: 'text-green-600' };
  if (v < 32) return { label: 'Acceptable',     color: 'text-amber-600' };
  return             { label: 'Obese',          color: 'text-red-600' };
};

const WeightRecordModal = ({ member, onSave, onClose }) => {
  const [form, setForm] = useState({ weight: member.weight || '', notes: '', recordDate: new Date().toISOString().split('T')[0] });
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">New Weight Record</p>
            <p className="text-[10px] opacity-60 mt-0.5">Track latest weight and keep history</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date</label>
            <input type="date" value={form.recordDate} onChange={e => setForm(f => ({ ...f, recordDate: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={form.weight}
              onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              placeholder="Enter weight"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows="3"
              placeholder="Add context for this reading"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button 
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              await onSave({ weight: form.weight, notes: form.notes, recordDate: form.recordDate });
              setIsSaving(false);
            }} 
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const BloodPressureModal = ({ member, onSave, onClose }) => {
  const [form, setForm] = useState({ bloodPressure: member.bloodPressure || '', sugarLevel: member.sugarLevel || '', date: new Date().toISOString().split('T')[0] });
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">+ New Record</p>
            <p className="text-[10px] opacity-60 mt-0.5">Add Blood Pressure and Sugar Level</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Blood Pressure</label>
            <input
              value={form.bloodPressure}
              onChange={e => setForm(f => ({ ...f, bloodPressure: e.target.value }))}
              placeholder="e.g. 120/80"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sugar Level (mg/dL)</label>
            <input
              type="number"
              value={form.sugarLevel}
              onChange={e => setForm(f => ({ ...f, sugarLevel: e.target.value }))}
              placeholder="e.g. 120"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button 
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              await onSave({ bloodPressure: form.bloodPressure, sugarLevel: form.sugarLevel, date: form.date });
              setIsSaving(false);
            }} 
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditMeasurementsModal = ({ member, onSave, onClose }) => {
  const gender = member.gender || '';
  const [form, setForm] = useState({
    height: member.height || '', weight: member.weight || '',
    waist:  member.waist  || '', hip:    member.hip    || '',
    neck:   member.neck   || '', chest:  member.chest  || '',
    arm:    member.arm    || '', thigh:  member.thigh  || '',
    notes:  '', date: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (name, value) => setForm(f => ({ ...f, [name]: value }));

  // Live body fat calculation
  const bodyFat = calcBodyFat(gender, form.height, form.waist, form.neck, form.hip);
  const bfCat   = bodyFat ? bfCategory(gender, bodyFat) : null;

  // BMI live calc
  const h = parseFloat(form.height), w = parseFloat(form.weight);
  const bmi = (h > 0 && w > 0) ? (w / Math.pow(h/100, 2)).toFixed(1) : null;

  const needsHip = gender === 'Female';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">New Measurement Record</p>
            {gender && <p className="text-[10px] opacity-50 mt-0.5">{gender} · Navy formula body fat</p>}
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="overflow-y-auto">
          <div className="p-5 grid grid-cols-2" style={{gap:'16px 20px'}}>
          <MeasureField label="Height" name="height" unit="cm" value={form.height} onChange={handleChange}/>
          <MeasureField label="Weight" name="weight" unit="kg" value={form.weight} onChange={handleChange}/>
          <MeasureField label="Waist"  name="waist"  unit="cm" value={form.waist}  onChange={handleChange}/>
          <MeasureField label={needsHip ? 'Hip ✱' : 'Hip'} name="hip" unit="cm" value={form.hip} onChange={handleChange}/>
          <MeasureField label="Neck"   name="neck"   unit="cm" value={form.neck}   onChange={handleChange}/>
          <MeasureField label="Chest"  name="chest"  unit="cm" value={form.chest}  onChange={handleChange}/>
          <MeasureField label="Arm"    name="arm"    unit="cm" value={form.arm}    onChange={handleChange}/>
          <MeasureField label="Thigh"  name="thigh"  unit="cm" value={form.thigh}  onChange={handleChange}/>
        </div>

        <div className="px-5 pb-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3" />
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows="3"
            placeholder="Add context for this record"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        </div>

        {/* Live calculated results */}
        <div className="mx-5 mb-4 rounded-xl bg-slate-50 border border-slate-100 p-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">BMI (auto)</p>
            <p className={`text-base font-black ${bmi ? (parseFloat(bmi)<18.5?'text-blue-600':parseFloat(bmi)<25?'text-emerald-600':parseFloat(bmi)<30?'text-amber-600':'text-red-600') : 'text-slate-300'}`}>
              {bmi || '—'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Body Fat % (auto)</p>
            {bodyFat ? (
              <p className={`text-base font-black ${bfCat?.color}`}>
                {bodyFat}% <span className="text-[10px] font-semibold">{bfCat?.label}</span>
              </p>
            ) : (
              <p className="text-base font-black text-slate-300">—
                <span className="text-[9px] font-normal text-slate-400 ml-1">
                  {!gender ? 'no gender' : needsHip && !form.hip ? 'need hip' : !form.neck ? 'need neck' : !form.waist ? 'need waist' : !form.height ? 'need height' : ''}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button 
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              await onSave({ ...form, bodyFat: bodyFat || form.bodyFat || member.bodyFat || '' });
              setIsSaving(false);
            }} 
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  Cafeteria History Modal
// ══════════════════════════════════════════════════════════════════════════════
const CafeteriaHistoryModal = ({ member, cafeteriaData, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-black text-slate-800">Cafeteria Record</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{member?.name}'s full transaction history</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
            <X size={20}/>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Balance Available</p>
            <p className={`text-3xl font-black mt-2 ${cafeteriaData.balance > 0 ? 'text-emerald-600' : cafeteriaData.balance < 0 ? 'text-red-600' : 'text-slate-700'}`}>
              ₹{Math.abs(cafeteriaData.balance || 0).toLocaleString('en-IN')}
              {cafeteriaData.balance < 0 ? ' (Due)' : ''}
            </p>
          </div>

          <div className="space-y-3">
            {cafeteriaData.transactions?.length === 0 ? (
              <div className="text-center py-10">
                <Apple size={32} className="mx-auto mb-3 opacity-20 text-slate-400"/>
                <p className="text-sm font-medium text-slate-500">No cafeteria transactions found.</p>
              </div>
            ) : (
              cafeteriaData.transactions.map(t => (
                <div key={t._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                      <Apple size={18} className="text-orange-500"/>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{t.itemName || t.item?.itemName || 'Item'} {t.quantity > 1 ? <span className="text-xs font-semibold text-slate-400 ml-1">x{t.quantity}</span> : ''}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{new Date(t.transactionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      {t.paymentMode && <p className="text-[10px] text-slate-400 mt-0.5">Paid via {t.paymentMode}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-700">₹{(t.totalAmount || 0).toLocaleString('en-IN')}</p>
                    <p className={`text-[10px] font-bold mt-1 uppercase tracking-wide ${t.paymentStatus === 'Paid' ? 'text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full inline-block' : 'text-red-500 bg-red-50 px-2 py-0.5 rounded-full inline-block'}`}>{t.paymentStatus}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  BMI / Weight History Modal
// ══════════════════════════════════════════════════════════════════════════════
const BmiHistoryModal = ({ member, bmiHistory, onClose, onDelete }) => {
  const [chartTab, setChartTab] = useState('weight');

  const W=520, H=200, PAD={t:24,r:20,b:36,l:46};
  const iW=W-PAD.l-PAD.r, iH=H-PAD.t-PAD.b;
  const n = bmiHistory.length;
  const xOf = i => PAD.l + (n<=1 ? iW/2 : (i/(n-1))*iW);

  const makeChart = (key, color, gradId, unit) => {
    const vals = bmiHistory.map(h => parseFloat(h[key])).filter(v => !isNaN(v) && v > 0);
    if (!vals.length) return <p className="text-xs text-slate-400 text-center py-8">No data</p>;
    const raw  = bmiHistory.map(h => parseFloat(h[key]) || null);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const pad  = (maxV - minV) * 0.25 || 2;
    const lo   = minV - pad, hi = maxV + pad;
    const yOf  = v => PAD.t + iH - ((v - lo) / (hi - lo)) * iH;

    const pts = raw.map((v,i) => v!=null ? [xOf(i), yOf(v)] : null).filter(Boolean);
    let linePath='', areaPath='';
    if (pts.length >= 2) {
      const cp = pts.map((p,i,a) => {
        const prev=a[i-1]||p, next=a[i+1]||p;
        return [[(p[0]+next[0])/2,(p[1]+next[1])/2],[(prev[0]+p[0])/2,(prev[1]+p[1])/2]];
      });
      linePath = `M${pts[0][0]},${pts[0][1]}` + pts.slice(1).map((p,i)=>`C${cp[i][0][0]},${cp[i][0][1]} ${cp[i+1]?.[1][0]??p[0]},${cp[i+1]?.[1][1]??p[1]} ${p[0]},${p[1]}`).join('');
      areaPath = linePath + ` L${pts[pts.length-1][0]},${PAD.t+iH} L${pts[0][0]},${PAD.t+iH} Z`;
    } else if (pts.length===1) {
      linePath = `M${pts[0][0]-1},${pts[0][1]} L${pts[0][0]+1},${pts[0][1]}`;
    }
    const ticks = Array.from({length:5},(_,i)=> lo+(i/4)*(hi-lo));
    const dateLabels = bmiHistory.map(h=>{const d=new Date(h.date);return `${d.getDate()}/${d.getMonth()+1}`;});

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:200}}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {ticks.map((t,i)=>{
          const y=yOf(t).toFixed(1);
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y} stroke="#e2e8f0" strokeWidth={i===0?0:1}/>
              <text x={PAD.l-6} y={parseFloat(y)+3} textAnchor="end" fontSize="9" fill="#94a3b8">{t.toFixed(1)}</text>
            </g>
          );
        })}
        {bmiHistory.map((_,i)=>(
          <line key={i} x1={xOf(i).toFixed(1)} y1={PAD.t} x2={xOf(i).toFixed(1)} y2={PAD.t+iH} stroke="#f1f5f9" strokeWidth="1"/>
        ))}
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`}/>}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
        {raw.map((v,i)=> v!=null ? (
          <g key={i}>
            <circle cx={xOf(i)} cy={yOf(v)} r="4" fill="white" stroke={color} strokeWidth="2"/>
            <text x={xOf(i)} y={yOf(v)-9} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{v}{unit}</text>
          </g>
        ):null)}
        {dateLabels.map((l,i)=>(
          <text key={i} x={xOf(i)} y={H-6} textAnchor="middle" fontSize="9" fill="#64748b">{l}</text>
        ))}
        <line x1={PAD.l} y1={PAD.t+iH} x2={W-PAD.r} y2={PAD.t+iH} stroke="#cbd5e1" strokeWidth="1"/>
        <line x1={PAD.l} y1={PAD.t}    x2={PAD.l}   y2={PAD.t+iH} stroke="#cbd5e1" strokeWidth="1"/>
      </svg>
    );
  };

  const bmiNum = parseFloat(member.bmi)||0;
  const bmiBg  = bmiNum<18.5?'bg-blue-50 text-blue-700':bmiNum<25?'bg-emerald-50 text-emerald-700':bmiNum<30?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-bold text-sm">Measurement History</p>
            <p className="text-xs opacity-60">{member.name} · {bmiHistory.length} record{bmiHistory.length!==1?'s':''}</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {bmiHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Scale size={36} className="mx-auto mb-3 opacity-20"/>
              <p className="text-sm font-medium">No history yet</p>
              <p className="text-xs mt-1">History is recorded each time you save measurements.</p>
            </div>
          ) : (
            <>
              {/* Current stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 text-blue-700 rounded-xl p-3">
                  <p className="text-[9px] font-bold uppercase opacity-60">Current Weight</p>
                  <p className="text-lg font-black mt-0.5">{member.weight ? `${member.weight} kg` : '—'}</p>
                </div>
                <div className={`rounded-xl p-3 ${bmiBg}`}>
                  <p className="text-[9px] font-bold uppercase opacity-60">Current BMI</p>
                  <p className="text-lg font-black mt-0.5">{member.bmi || '—'}</p>
                </div>
                <div className="bg-purple-50 text-purple-700 rounded-xl p-3">
                  <p className="text-[9px] font-bold uppercase opacity-60">Body Fat</p>
                  <p className="text-lg font-black mt-0.5">{member.bodyFat ? `${member.bodyFat}%` : '—'}</p>
                </div>
              </div>

              {/* Chart with tabs */}
              {bmiHistory.length >= 2 && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  {/* Tab bar */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={()=>setChartTab('weight')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${chartTab==='weight'?'bg-blue-600 text-white shadow-sm':'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'}`}>
                      <span className={`w-2 h-2 rounded-full ${chartTab==='weight'?'bg-white':'bg-blue-500'}`}/>
                      Weight
                    </button>
                    <button
                      onClick={()=>setChartTab('bmi')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${chartTab==='bmi'?'bg-rose-500 text-white shadow-sm':'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'}`}>
                      <span className={`w-2 h-2 rounded-full ${chartTab==='bmi'?'bg-white':'bg-rose-500'}`}/>
                      BMI
                    </button>
                    <button
                      onClick={()=>setChartTab('waist')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${chartTab==='waist'?'bg-amber-500 text-white shadow-sm':'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'}`}>
                      <span className={`w-2 h-2 rounded-full ${chartTab==='waist'?'bg-white':'bg-amber-500'}`}/>
                      Waist
                    </button>
                    <button
                      onClick={()=>setChartTab('bodyFat')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${chartTab==='bodyFat'?'bg-emerald-500 text-white shadow-sm':'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'}`}>
                      <span className={`w-2 h-2 rounded-full ${chartTab==='bodyFat'?'bg-white':'bg-emerald-500'}`}/>
                      Body Fat
                    </button>
                    {chartTab==='bmi' && (
                      <div className="ml-auto flex items-center gap-2 text-[9px] font-semibold">
                        <span className="text-blue-500">{'<18.5 Under'}</span>
                        <span className="text-emerald-500">18.5–25 Normal</span>
                        <span className="text-amber-500">25–30 Over</span>
                        <span className="text-red-500">{'>30 Obese'}</span>
                      </div>
                    )}
                    {chartTab==='weight' && (
                      <span className="ml-auto text-[10px] text-slate-400 font-semibold">kg</span>
                    )}
                    {chartTab==='waist' && (
                      <span className="ml-auto text-[10px] text-slate-400 font-semibold">cm</span>
                    )}
                    {chartTab==='bodyFat' && (
                      <span className="ml-auto text-[10px] text-slate-400 font-semibold">%</span>
                    )}
                  </div>
                  {chartTab==='weight'  && makeChart('weight', '#3b82f6','wGrad','kg')}
                  {chartTab==='bmi'     && makeChart('bmi',    '#f43f5e','bGrad','')}
                  {chartTab==='waist'   && makeChart('waist',  '#f59e0b','waGrad','cm')}
                  {chartTab==='bodyFat' && makeChart('bodyFat','#10b981','bfGrad','%')}
                </div>
              )}

              {/* History table */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">All Records</p>
                <div className="rounded-xl border border-slate-100 overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Date','Weight','BMI','Waist','Hip','Body Fat', ''].map((h, idx)=>(
                          <th key={idx} className={`px-3 py-2 text-[9px] font-bold text-slate-400 uppercase ${idx === 0 ? 'text-left' : idx === 6 ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...bmiHistory].reverse().map((h,i)=>{
                        const bv=parseFloat(h.bmi)||0;
                        const bc=bv<18.5?'text-blue-600':bv<25?'text-emerald-600':bv<30?'text-amber-600':'text-red-600';
                        return (
                          <tr key={h._id || i} className={`border-t border-slate-50 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                            <td className="px-3 py-2 font-medium text-slate-700">{new Date(h.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                            <td className="px-3 py-2 font-bold text-blue-600">{h.weight??'—'} <span className="font-normal text-slate-400">kg</span></td>
                            <td className={`px-3 py-2 font-bold ${bc}`}>{h.bmi??'—'}</td>
                            <td className="px-3 py-2 text-slate-600">{h.waist??'—'}{h.waist&&<span className="text-slate-400"> cm</span>}</td>
                            <td className="px-3 py-2 text-slate-600">{h.hip??'—'}{h.hip&&<span className="text-slate-400"> cm</span>}</td>
                            <td className="px-3 py-2 text-slate-600">{h.bodyFat??'—'}{h.bodyFat&&<span className="text-slate-400"> %</span>}</td>
                            <td className="px-3 py-2 text-right">
                              {onDelete && h._id && (
                                <button onClick={() => onDelete(h._id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition" title="Delete Record">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-4 flex-shrink-0">
          <button onClick={onClose} className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
};

const HealthRecordsModal = ({ records = [], member, onClose, onDelete }) => {
  const sorted = (records || []).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const bpPoints = (records||[]).map(r => ({ x: new Date(r.date), y: r.systolic || null }));
  const sugarPoints = (records||[]).map(r => ({ x: new Date(r.date), y: r.sugarLevel != null ? Number(r.sugarLevel) : null }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Health Records</p>
            <p className="text-xs opacity-60">{member?.name} · {records.length} record{records.length!==1?'s':''}</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-3 bg-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">BP Trend</p>
              {bpPoints.length<2? <p className="text-xs text-slate-400">Not enough data</p> : <MiniLineChart points={bpPoints} color="#f59e0b" />}
            </div>
            <div className="rounded-xl p-3 bg-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Sugar Trend</p>
              {sugarPoints.length<2? <p className="text-xs text-slate-400">Not enough data</p> : <MiniLineChart points={sugarPoints} color="#7c3aed" unit="mg/dL" />}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-xs text-slate-400">
                <tr><th className="text-left">Date</th><th>Time</th><th>BP</th><th>Sugar</th><th>By</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r._id} className="border-t border-slate-50">
                    <td className="py-2">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                    <td className="py-2">{r.time || new Date(r.date).toTimeString().slice(0,5)}</td>
                    <td className="py-2 font-bold">{r.bloodPressure || '—'}</td>
                    <td className="py-2">{r.sugarLevel != null ? `${r.sugarLevel} mg/dL` : '—'}</td>
                    <td className="py-2 text-xs text-slate-500">{r.recordedBy ? r.recordedBy : '—'}</td>
                    <td className="py-2 text-right">
                      {onDelete && (
                        <button onClick={() => onDelete(r._id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition" title="Delete Record">
                          <Trash2 size={14} />
                        </button>
                      )}
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
};

// ══════════════════════════════════════════════════════════════════════════════
//  Main MemberProfile Page
// ══════════════════════════════════════════════════════════════════════════════
const WeightTrendChart = ({ history }) => {
  const points = (history || []).filter(h => Number(h.weight) > 0).map((h, i) => ({
    weight: Number(h.weight),
    label: new Date(h.recordDate || h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));

  if (!points.length) {
    return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">No weight history yet</div>;
  }

  const W = 480, H = 180, PAD = { t: 16, r: 16, b: 26, l: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const vals = points.map(p => p.weight);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const padV = Math.max(1, (maxV - minV) * 0.2);
  const lo = minV - padV;
  const hi = maxV + padV;
  const xOf = (i) => PAD.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yOf = (v) => PAD.t + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
  const linePoints = points.map((p, i) => [xOf(i), yOf(p.weight)]);
  const linePath = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${linePoints[linePoints.length - 1][0].toFixed(1)},${H - PAD.b} L${linePoints[0][0].toFixed(1)},${H - PAD.b} Z`;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = PAD.t + innerH * ratio;
          return <g key={index}><line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e2e8f0" strokeWidth="1" /><text x={PAD.l - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{(hi - (hi - lo) * ratio).toFixed(1)}</text></g>;
        })}
        <path d={areaPath} fill="url(#weightArea)" />
        <path d={linePath} fill="none" stroke="#dc2626" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        {linePoints.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="#dc2626" strokeWidth="2" />
            <text x={p[0]} y={H - 8} textAnchor="middle" fontSize="8" fill="#64748b">{points[i].label}</text>
          </g>
        ))}
        <defs>
          <linearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.04" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member,      setMember]      = useState(null);
  const [dietPlan,    setDietPlan]    = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [attendance,  setAttendance]  = useState([]);
  const [payments,    setPayments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeMonth, setActiveMonth] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');

  const [showPhoto,     setShowPhoto]     = useState(false);
  const [showDiet,      setShowDiet]      = useState(false);
  const [showWorkout,   setShowWorkout]   = useState(false);
  const [showMeasure,   setShowMeasure]   = useState(false);
  const [showAddons,    setShowAddons]    = useState(false);
  const [addonsForm,    setAddonsForm]    = useState({ personalTraining:'No', customWorkout:'No', customDiet:'No', rehabTherapy:'No' });
  const [addonsSaving, setAddonsSaving]  = useState(false);
  const [bmiHistory,    setBmiHistory]    = useState([]);
  const [weightHistory, setWeightHistory]  = useState([]);
  const [showBmiHistory,setShowBmiHistory]= useState(false);
  const [showWeightRecord, setShowWeightRecord] = useState(false);
  const [showBloodPressureRecord, setShowBloodPressureRecord] = useState(false); // (deprecated)
  const [healthRecords, setHealthRecords] = useState([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showHealthRecords, setShowHealthRecords] = useState(false);

  // New states for Progress Photos & Measurements Inspect
  const [progressPhotoSessions, setProgressPhotoSessions] = useState([]);
  const [showProgressPhotoUpload, setShowProgressPhotoUpload] = useState(false);
  const [inspectProgressPhoto, setInspectProgressPhoto] = useState(null);
  const [inspectMeasurement, setInspectMeasurement] = useState(null);
  const [cafeteriaData, setCafeteriaData] = useState(null);
  const [showCafeteriaHistory, setShowCafeteriaHistory] = useState(false);

  useEffect(()=>{ if(id) fetchAll(); },[id]);

  // ── Auto-sync a plan from its saved Google Sheet link ──────────────────────
  const syncFromGSheet = async (plan, type) => {
    if (!plan?.gsheetLink) return null;
    try {
      const res = await CustomBaseUrl.get(`/proxy/gsheet-csv?url=${encodeURIComponent(plan.gsheetLink)}`);
      const text = typeof res.data === 'string' ? res.data : '';
      if (!text) return null;
      const rows = parseCSV(text);
      if (!rows.length) return null;
      const payload = type === 'diet'
        ? { ...csvRowToDietPayload(rows[0], id), gsheetLink: plan.gsheetLink }
        : { ...csvRowsToWorkoutPayload(rows, id), gsheetLink: plan.gsheetLink };
      const endpoint = type === 'diet' ? `/reg-diet-plans/${plan._id}` : `/reg-workout-plans/${plan._id}`;
      const upd = await CustomBaseUrl.put(endpoint, payload);
      return upd.data?.plan || null;
    } catch { return null; }
  };

  const sortWeightEntries = (entries) => [...entries].sort((a, b) => {
    const aDate = new Date(a.recordDate || a.createdAt || 0).getTime();
    const bDate = new Date(b.recordDate || b.createdAt || 0).getTime();
    if (aDate !== bDate) return aDate - bDate;
    const aTime = a.recordTime || "";
    const bTime = b.recordTime || "";
    return aTime.localeCompare(bTime);
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mR, dR, wR, aR, pR, prR, whR, hrR, ppsR, cafR] = await Promise.allSettled([
        CustomBaseUrl.get(`/fetchone/${id}`),
        CustomBaseUrl.get(`/reg-diet-plans/member/${id}`),
        CustomBaseUrl.get(`/reg-workout-plans/member/${id}`),
        CustomBaseUrl.get(`/xls-attendance/member/${id}`),
        CustomBaseUrl.get(`/reg-payments/member/${id}`),
        CustomBaseUrl.get(`/member-progress/member/${id}`),
        CustomBaseUrl.get(`/weight-history/member/${id}`),
        CustomBaseUrl.get(`/health-records/member/${id}`),
        CustomBaseUrl.get(`/progress-photo-session/member/${id}`),
        CustomBaseUrl.get(`/cafeteria/member-balance/${id}`),
      ]);
      if(mR.status==='fulfilled') setMember(mR.value.data?.data);

      let dietLoaded  = dR.status==='fulfilled'&&dR.value.data?.success ? dR.value.data.plan : null;
      let workoutLoaded = wR.status==='fulfilled'&&wR.value.data?.success ? wR.value.data.plan : null;

      // Auto-sync from Google Sheet in parallel (silent, best-effort)
      const [syncedDiet, syncedWorkout] = await Promise.all([
        syncFromGSheet(dietLoaded, 'diet'),
        syncFromGSheet(workoutLoaded, 'workout'),
      ]);

      setDietPlan(syncedDiet || dietLoaded);
      setWorkoutPlan(syncedWorkout || workoutLoaded);

      if(aR.status==='fulfilled'){
        const recs=(aR.value.data?.records||[]).sort((a,b)=>b.month.localeCompare(a.month));
        setAttendance(recs); if(recs.length>0) setActiveMonth(recs[0].month);
      }
      if(pR.status==='fulfilled') setPayments(pR.value.data?.payments||[]);

      if(prR.status==='fulfilled') setBmiHistory(prR.value.data?.data||[]);
      if(whR.status==='fulfilled') setWeightHistory(sortWeightEntries(whR.value.data?.records || []));
      if(hrR && hrR.status==='fulfilled') setHealthRecords(hrR.value.data?.data || []);
      if(ppsR && ppsR.status==='fulfilled') setProgressPhotoSessions(ppsR.value.data?.data || []);
      if(cafR && cafR.status==='fulfilled' && cafR.value.data?.success) setCafeteriaData({ balance: cafR.value.data.balance, transactions: cafR.value.data.transactions || [] });
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const pushBmiHistory = async (form, bmi) => {
    const res = await CustomBaseUrl.post('/member-progress', {
      registrationId: id,
      date: form.date || undefined,
      weight: form.weight || undefined,
      height: form.height || undefined,
      bmi:    bmi         || undefined,
      waist:  form.waist   || undefined,
      hip:    form.hip     || undefined,
      neck:   form.neck    || undefined,
      chest:  form.chest   || undefined,
      bodyFat: form.bodyFat || undefined,
    });
    setBmiHistory(prev => {
      const exists = prev.some(r => r._id === res.data.data._id);
      const updated = exists ? prev : [...prev, res.data.data];
      return updated.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
    });
  };

  const pushWeightHistory = async (form) => {
    const payload = {
      registrationId: id,
      memberName: member?.name || '',
      weight: form.weight ?? member?.weight,
      recordDate: form.recordDate || new Date().toISOString(),
      recordTime: new Date().toTimeString().slice(0, 5),
      notes: form.notes || '',
      recordType: 'update',
    };
    const res = await CustomBaseUrl.post('/weight-history', payload);
    setWeightHistory(prev => {
      const exists = prev.some(r => r._id === res.data.entry._id);
      const updated = exists ? prev : [...prev, res.data.entry];
      return sortWeightEntries(updated);
    });
    return res.data.entry;
  };

  const buildMemberPayload = (updates = {}) => ({
    ...member,
    ...updates,
    name: member.name,
    age: member.age,
    gender: member.gender,
    emails: member.emails,
    phone: member.phone,
    address: member.address,
    pincode: member.pincode,
    packages: member.packages,
    duration: member.duration,
    services: member.services,
    startDate: member.startDate?.split?.('T')[0],
    endDate: member.endDate?.split?.('T')[0],
  });

  // ── Diet import handler ─────────────────────────────────────────────────────
  const handleDietImport = async (rows, gsheetLink = '') => {
    const payload = { ...csvRowToDietPayload(rows[0], id), gsheetLink };
    const method = dietPlan ? 'put' : 'post';
    const endpoint = dietPlan ? `/reg-diet-plans/${dietPlan._id}` : `/reg-diet-plans`;
    const res = await CustomBaseUrl[method](endpoint, payload);
    if (!res.data.success) throw new Error(res.data.message || 'Import failed');
    setDietPlan(res.data.plan);
  };

  // ── Workout import handler ──────────────────────────────────────────────────
  const handleWorkoutImport = async (rows, gsheetLink = '') => {
    const payload = { ...csvRowsToWorkoutPayload(rows, id), gsheetLink };
    const method = workoutPlan ? 'put' : 'post';
    const endpoint = workoutPlan ? `/reg-workout-plans/${workoutPlan._id}` : `/reg-workout-plans`;
    const res = await CustomBaseUrl[method](endpoint, payload);
    if (!res.data.success) throw new Error(res.data.message || 'Import failed');
    setWorkoutPlan(res.data.plan);
  };

  const handleDeleteDiet = async () => {
    if(!dietPlan||!window.confirm('Delete diet plan?')) return;
    await CustomBaseUrl.delete(`/reg-diet-plans/${dietPlan._id}`);
    setDietPlan(null);
  };

  const handleDeleteWorkout = async () => {
    if(!workoutPlan||!window.confirm('Delete workout plan?')) return;
    await CustomBaseUrl.delete(`/reg-workout-plans/${workoutPlan._id}`);
    setWorkoutPlan(null);
  };

  const openAddons = () => {
    setAddonsForm({
      personalTraining: member.personalTraining || 'No',
      customWorkout:    member.customWorkout    || 'No',
      customDiet:       member.customDiet       || 'No',
      rehabTherapy:     member.rehabTherapy     || 'No',
    });
    setShowAddons(true);
  };

  const handleSaveAddons = async () => {
    setAddonsSaving(true);
    try {
      await CustomBaseUrl.post(`/update/${id}`, {
        ...member, ...addonsForm,
        name: member.name, age: member.age, gender: member.gender,
        emails: member.emails, phone: member.phone, address: member.address,
        pincode: member.pincode, packages: member.packages, duration: member.duration,
        services: member.services,
        startDate: member.startDate?.split?.('T')[0],
        endDate:   member.endDate?.split?.('T')[0],
      });
      setMember(m => ({ ...m, ...addonsForm }));
      setShowAddons(false);
    } catch(e) { console.error(e); }
    finally { setAddonsSaving(false); }
  };

  const handleSaveMeasurements = async (form) => {
    const bmi = (parseFloat(form.weight) && parseFloat(form.height))
      ? (parseFloat(form.weight) / Math.pow(parseFloat(form.height)/100, 2)).toFixed(1)
      : member.bmi;
    const bodyFat = form.bodyFat || calcBodyFat(member.gender, form.height, form.waist, form.neck, form.hip) || member.bodyFat || '';
    const newWeight = form.weight !== undefined && form.weight !== '' ? form.weight : member.weight;
    
    await pushWeightHistory({ ...form, weight: newWeight, notes: form.notes || '', recordDate: form.date });
    await pushBmiHistory({ ...form, bodyFat }, bmi);
    
    // Fetch latest profile to ensure frontend displays correct 'latest' stats based on chronological date
    const updatedMemberRes = await CustomBaseUrl.get(`/fetchone/${id}`);
    if (updatedMemberRes.data && updatedMemberRes.data.data) {
       setMember(updatedMemberRes.data.data);
    }
    setShowMeasure(false);
  };

  const handleSaveWeightRecord = async ({ weight, notes, recordDate }) => {
    const parsedWeight = parseFloat(weight);
    const newWeight = parsedWeight > 0 ? parsedWeight : member.weight;
    
    await pushWeightHistory({ weight: newWeight, notes: notes || '', recordDate });
    await pushBmiHistory({ weight: newWeight, height: member.height, notes: notes || '', date: recordDate }, null);
    
    const updatedMemberRes = await CustomBaseUrl.get(`/fetchone/${id}`);
    if (updatedMemberRes.data && updatedMemberRes.data.data) {
       setMember(updatedMemberRes.data.data);
    }
    setShowWeightRecord(false);
  };

  const handleSaveHealthRecord = async ({ bloodPressure, sugarLevel, date }) => {
    try {
      const payload = { registrationId: id, bloodPressure: bloodPressure || undefined, sugarLevel: sugarLevel !== undefined && sugarLevel !== '' ? Number(sugarLevel) : undefined, date };
      const res = await CustomBaseUrl.post('/health-records', payload);
      if (res.data && res.data.data && res.data.success) {
        setHealthRecords(prev => {
          const exists = prev.some(r => r._id === res.data.data._id);
          const updated = exists ? prev : [...prev, res.data.data];
          return updated.sort((a,b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
        });
        const updatedMemberRes = await CustomBaseUrl.get(`/fetchone/${id}`);
        if (updatedMemberRes.data && updatedMemberRes.data.data) {
           setMember(updatedMemberRes.data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setShowHealthModal(false);
  };

  const handleDeleteHealthRecord = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this health record?")) return;
    try {
      await CustomBaseUrl.delete(`/health-records/${recordId}`);
      setHealthRecords(prev => prev.filter(r => r._id !== recordId));
    } catch (e) {
      if (e.response && e.response.status === 403) alert("Cannot delete the initial admission record.");
      else console.error(e);
    }
  };

  const handleDeleteBmiHistory = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this measurement record?")) return;
    try {
      await CustomBaseUrl.delete(`/member-progress/${recordId}`);
      setBmiHistory(prev => prev.filter(r => r._id !== recordId));
    } catch (e) {
      if (e.response && e.response.status === 403) alert("Cannot delete the initial admission record.");
      else console.error(e);
    }
  };

  const handleDeleteProgressPhoto = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this progress photo session?")) return;
    try {
      await CustomBaseUrl.delete(`/progress-photo-session/${recordId}`);
      setProgressPhotoSessions(prev => prev.filter(r => r._id !== recordId));
      setInspectProgressPhoto(null);
    } catch (e) {
      if (e.response && e.response.status === 403) alert("Cannot delete the initial admission record.");
      else console.error(e);
    }
  };

  // ── Loading / not found ─────────────────────────────────────────────────────
  if(loading) return <div className="min-h-screen bg-slate-300 "><Navbar/><div className="flex items-center justify-center py-24"><RefreshCw size={24} className="animate-spin text-slate-300"/></div></div>;
  if(!member) return <div className="min-h-screen bg-slate-300 "><Navbar/><div className="text-center py-24 text-slate-400"><User size={40} className="mx-auto mb-3 opacity-30"/><p>Member not found</p><button onClick={()=>navigate('/members')} className="mt-4 text-red-600 underline text-sm">← Back</button></div></div>;

  const status = getStatus(member.endDate);
  const bmi    = parseFloat(member.bmi)||0;
  const bmiCat = bmi<18.5?'Underweight':bmi<25?'Normal':bmi<30?'Overweight':'Obese';
  const bmiClr = bmi<18.5?'text-blue-600':bmi<25?'text-emerald-600':bmi<30?'text-amber-600':'text-red-600';
  const bmiPct = Math.min(100,Math.max(0,((bmi-10)/30)*100));
  const selAtt = attendance.find(r=>r.month===activeMonth);
  const attPct = selAtt?.workDays>0?Math.round((selAtt.attendDays/selAtt.workDays)*100):0;

  const handleProfileImageEdit = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('profileImage', file);

    // Append existing fields to pass backend validation and avoid wiping out data
    const fieldsToKeep = [
      'name', 'age', 'gender', 'emails', 'height', 'weight', 'bmi', 'bloodGroup',
      'issues', 'description', 'profession', 'phone', 'address', 'pincode',
      'packages', 'duration', 'services', 'startDate', 'endDate',
      'bodyFat', 'waist', 'neck', 'hip', 'sugarLevel', 'bloodPressure',
      'attendanceId', 'personalTraining', 'customWorkout', 'customDiet', 'rehabTherapy', 'goal'
    ];
    fieldsToKeep.forEach(field => {
      if (member[field] !== undefined && member[field] !== null) {
        formData.append(field, member[field]);
      }
    });

    try {
      setLoading(true);
      const res = await CustomBaseUrl.post(`/update/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data && res.data.data) { setMember(res.data.data); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleProgressPhotoSessionUpload = async (formData) => {
    try {
      formData.append('registrationId', id);
      const res = await CustomBaseUrl.post(`/progress-photo-session`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data && res.data.data) { 
        setProgressPhotoSessions(prev => {
          const exists = prev.some(r => r._id === res.data.data._id);
          const updated = exists ? prev : [res.data.data, ...prev];
          return updated.sort((a,b)=>new Date(b.date || b.createdAt)-new Date(a.date || a.createdAt));
        }); 
      }
      setShowProgressPhotoUpload(false);
    } catch (err) { console.error(err); }
  };

  const handleToggleTop10 = async () => {
    try {
      const newStatus = !member.isTop10;
      const res = await CustomBaseUrl.post(`/update/${id}`, {
        ...member,
        isTop10: newStatus,
        name: member.name, age: member.age, gender: member.gender,
        emails: member.emails, phone: member.phone, address: member.address,
        pincode: member.pincode, packages: member.packages, duration: member.duration,
        services: member.services,
        startDate: member.startDate?.split?.('T')[0],
        endDate:   member.endDate?.split?.('T')[0],
      });
      if (res.data && res.data.data) {
        setMember(res.data.data);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update Top 10 status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-300 ">
      <Navbar/>
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={()=>navigate('/members')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition">
            <ArrowLeft size={15}/> Members
          </button>
          <button onClick={()=>navigate('/register',{state:{editData:member}})}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition">
            <Edit3 size={13}/> Edit Member
          </button>
        </div>

        {/* ── Member Profile Header ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5">
          <div className="h-28 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 relative"></div>
          <div className="px-6 pb-6 relative">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12 mb-4">
              <div className="w-28 h-28 rounded-2xl ring-4 ring-white overflow-hidden bg-slate-200 flex items-center justify-center shadow-lg relative group shrink-0">
                {member.images?.profileImage
                  ? <img src={member.images.profileImage} alt={member.name} className="w-full h-full object-cover cursor-pointer" onError={e=>e.target.style.display='none'} onClick={() => setShowPhoto(true)} />
                  : <span className="text-4xl font-black text-slate-400">{member.name?.[0]?.toUpperCase()}</span>
                }
                <label className="absolute bottom-0 inset-x-0 h-8 bg-black/60 text-white flex justify-center items-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-[10px] font-bold uppercase tracking-wider">
                  Edit
                  <input type="file" className="hidden" accept="image/*" onChange={handleProfileImageEdit} />
                </label>
              </div>
              <div className="flex-1 pb-1 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-slate-900">{member.name}</h1>
                    <button 
                      onClick={handleToggleTop10} 
                      title={member.isTop10 ? "Remove from Top 10" : "Add to Top 10"}
                      className={`p-1.5 rounded-xl transition ${member.isTop10 ? 'bg-amber-100 text-amber-500 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-amber-500'}`}
                    >
                      <Star size={20} fill={member.isTop10 ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium mt-1">{member.gender} · {member.age} yrs · {member.bloodGroup||'—'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${status.color}`}>
                      <span className={`w-2 h-2 rounded-full ${status.dot}`}/>{status.label}
                    </span>
                    {member.attendanceId&&<span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">ID: {member.attendanceId}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-4 border-t border-slate-100">
              {member.phone  &&<div className="flex items-center gap-2 text-sm text-slate-600 font-medium"><Phone  size={14} className="text-slate-400"/>{member.phone}</div>}
              {member.emails &&<div className="flex items-center gap-2 text-sm text-slate-600 font-medium"><Mail   size={14} className="text-slate-400"/>{member.emails}</div>}
              {member.address&&<div className="flex items-center gap-2 text-sm text-slate-600 font-medium"><MapPin size={14} className="text-slate-400"/>{member.address}</div>}
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex overflow-x-auto gap-2 mb-6 hide-scrollbar pb-1">
          {['Overview', 'Health Records', 'Progress Photos', 'Attendance', 'Workout & Diet', 'Add-ons', 'Payments', 'Cafeteria'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="space-y-6">
          
          {/* OVERVIEW TAB (BENTO GRID) */}
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-fr">
              
              {/* Tile: Membership Status (1x1) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-center">
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Package</p>
                  <p className="font-black text-slate-800 text-lg leading-tight">{member.packages || 'None'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">End Date</p>
                  <p className="font-bold text-slate-800 text-sm">{member.endDate ? new Date(member.endDate).toLocaleDateString('en-IN') : '—'}</p>
                </div>
              </div>

              {/* Tile: Financials (1x1) */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                 <div className="flex-1 bg-orange-50 p-4 cursor-pointer hover:bg-orange-100 transition flex flex-col justify-center" onClick={() => setActiveTab('Cafeteria')}>
                   <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Apple size={10}/> Cafeteria</p>
                   {cafeteriaData ? (
                     <p className={`font-black text-lg ${cafeteriaData.balance > 0 ? 'text-emerald-600' : cafeteriaData.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                       ₹{Math.abs(cafeteriaData.balance || 0).toLocaleString('en-IN')}{cafeteriaData.balance < 0 ? ' Due' : ''}
                     </p>
                   ) : <p className="font-bold text-slate-400 text-sm">...</p>}
                 </div>
                 <div className="flex-1 bg-emerald-50 p-4 border-t border-white cursor-pointer hover:bg-emerald-100 transition flex flex-col justify-center" onClick={() => setActiveTab('Payments')}>
                   <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1"><CreditCard size={10}/> Membership Balance</p>
                   {payments.length > 0 ? (
                     <p className={`font-black text-lg ${payments[0].balanceAmount > 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                       {payments[0].balanceAmount > 0 ? `₹${payments[0].balanceAmount.toLocaleString('en-IN')} Due` : 'All Paid'}
                     </p>
                   ) : <p className="font-bold text-slate-400 text-sm">No records</p>}
                 </div>
              </div>

              {/* Tile: Health Snapshot (2x1) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm md:col-span-2 cursor-pointer hover:border-slate-300 transition flex flex-col" onClick={() => setActiveTab('Health Records')}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><Heart size={16} className="text-red-500"/> Health Snapshot</h2>
                  <span className="text-xs font-bold text-slate-400 hover:text-slate-600 transition">View All →</span>
                </div>
                <div className="grid grid-cols-4 gap-2 flex-1">
                  {(() => {
                    const latest = healthRecords && healthRecords.length ? healthRecords[healthRecords.length - 1] : null;
                    return [
                      { label: 'Weight', value: member.weight ? `${member.weight}kg` : '—', color: 'bg-slate-50 text-slate-800' },
                      { label: 'Height', value: member.height ? `${member.height}cm` : '—', color: 'bg-slate-50 text-slate-800' },
                      { label: 'BP', value: latest?.bloodPressure || member.bloodPressure || '—', color: 'bg-amber-50 text-amber-700' },
                      { label: 'Sugar', value: latest?.sugarLevel ? `${latest.sugarLevel}` : (member.sugarLevel ? `${member.sugarLevel}` : '—'), color: 'bg-violet-50 text-violet-700' },
                    ].map((stat, i) => (
                      <div key={i} className={`rounded-2xl p-2 flex flex-col justify-center items-center text-center ${stat.color}`}>
                        <p className="text-[9px] font-bold uppercase opacity-60 mb-1">{stat.label}</p>
                        <p className="text-sm font-black">{stat.value}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Tile: Attendance (1x2) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm cursor-pointer hover:border-slate-300 transition flex flex-col items-center text-center lg:row-span-2" onClick={() => setActiveTab('Attendance')}>
                <h2 className="font-bold text-slate-800 flex items-center justify-center gap-2 mb-6 w-full"><Calendar size={16} className="text-indigo-500"/> Attendance</h2>
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  {selAtt ? (
                    <>
                      <div className="relative mb-4" style={{width: 100, height: 100}}>
                        <Ring pct={attPct} size={100}/>
                        <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-black text-slate-700">{attPct}%</span></div>
                      </div>
                      <p className="text-base font-black text-slate-800">{selAtt.attendDays} / {selAtt.workDays} days</p>
                      <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1">{MONTH_LABELS[activeMonth] || activeMonth}</p>
                    </>
                  ) : (
                    <div className="py-8">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center">No data for current month</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tile: Active Plans (1x2) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm cursor-pointer hover:border-slate-300 transition flex flex-col lg:row-span-2" onClick={() => setActiveTab('Workout & Diet')}>
                <h2 className="font-bold text-slate-800 flex items-center justify-center gap-2 mb-6"><Dumbbell size={16} className="text-emerald-500"/> Current Plans</h2>
                <div className="space-y-4 flex-1 flex flex-col justify-center w-full">
                  <div className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Workout</span>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${workoutPlan ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {workoutPlan ? workoutPlan.goal || 'Active' : 'None'}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Diet</span>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${dietPlan ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {dietPlan ? dietPlan.goal || 'Active' : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tile: Progress Photos (2x2) */}
              <div className="bg-slate-900 rounded-3xl p-5 shadow-lg md:col-span-2 lg:row-span-2 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-white flex items-center gap-2"><Activity size={16} className="text-blue-400"/> Latest Progress</h2>
                  <button onClick={() => setActiveTab('Progress Photos')} className="text-xs font-bold text-slate-400 hover:text-white transition">Gallery →</button>
                </div>
                <div className="flex-1 flex flex-col h-[200px] lg:h-auto">
                  {progressPhotoSessions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl h-full">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">No photos uploaded</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 h-full cursor-pointer" onClick={() => setInspectProgressPhoto(progressPhotoSessions[0])}>
                      {['Front', 'Side', 'Back'].map(view => {
                        const url = progressPhotoSessions[0][`${view.toLowerCase()}Image`];
                        return (
                          <div key={view} className="bg-slate-800 rounded-2xl overflow-hidden relative group h-full flex flex-col justify-end">
                            {url ? (
                              <img src={url} alt={view} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            ) : (
                              <div className="absolute inset-0 w-full h-full flex items-center justify-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">{view}</div>
                            )}
                            {url && <div className="relative bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-8 text-white text-[9px] font-bold uppercase tracking-widest text-center">{view}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* HEALTH RECORDS TAB */}
          {activeTab === 'Health Records' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Measurements Column */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Scale size={20} className="text-blue-500"/> Body Measurements</h2>
                    <div className="flex gap-2">
                      <button onClick={()=>setShowBmiHistory(true)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition">History</button>
                      <button onClick={()=>setShowMeasure(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">+ New</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                    <div className="relative shrink-0" style={{width:72,height:72}}>
                      <Ring pct={bmiPct} size={72}/>
                      <div className="absolute inset-0 flex items-center justify-center"><span className={`text-sm font-black ${bmiClr}`}>{bmi||'—'}</span></div>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-bold tracking-widest">BMI Status</p>
                      <p className={`font-black text-lg ${bmiClr}`}>{bmiCat}</p>
                      {member.bodyFat&&<p className="text-xs font-semibold text-slate-500 mt-1">Body fat: {member.bodyFat}%</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[['Height',member.height,'cm'],['Weight',member.weight,'kg'],
                      ['Waist',member.waist,'cm'],['Hip',member.hip,'cm'],
                      ['Neck',member.neck,'cm'],['Chest',member.chest,'cm'],
                      ['Arm',member.arm,'cm'],['Thigh',member.thigh,'cm']
                    ].filter(([,v])=>v).map(([l,v,u])=>(
                      <div key={l} className="bg-white border border-slate-100 shadow-sm rounded-xl px-4 py-3 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{v} <span className="text-xs font-semibold text-slate-400">{u}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vitals Column */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Heart size={20} className="text-red-500"/> Vital Records</h2>
                    <div className="flex gap-2">
                      <button onClick={()=>setShowHealthRecords(true)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition">History</button>
                      <button onClick={()=>setShowHealthModal(true)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition">+ New</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {(() => {
                      const latest = healthRecords && healthRecords.length ? healthRecords[healthRecords.length - 1] : null;
                      return [
                        ['Blood Pressure', latest?.bloodPressure || member.bloodPressure || '—', 'bg-amber-50 border border-amber-100 text-amber-800'],
                        ['Sugar Level', latest?.sugarLevel ? `${latest.sugarLevel} mg/dL` : (member.sugarLevel ? `${member.sugarLevel} mg/dL` : '—'), 'bg-violet-50 border border-violet-100 text-violet-800'],
                      ].map(([label, value, classes]) => (
                        <div key={label} className={`rounded-xl p-4 ${classes}`}>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{label}</p>
                          <p className="text-xl font-black">{value}</p>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl p-4 bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Blood Pressure Trend</p>
                      {healthRecords.length < 2 ? <p className="text-sm text-slate-400 font-medium">Not enough data</p> : (
                        <MiniLineChart points={healthRecords.map(r => ({ x: new Date(r.date), y: r.systolic || null }))} color="#f59e0b" unit="" />
                      )}
                    </div>
                    <div className="rounded-2xl p-4 bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Sugar Level Trend</p>
                      {healthRecords.length < 2 ? <p className="text-sm text-slate-400 font-medium">Not enough data</p> : (
                        <MiniLineChart points={healthRecords.map(r => ({ x: new Date(r.date), y: r.sugarLevel != null ? Number(r.sugarLevel) : null }))} color="#7c3aed" unit="mg/dL" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* PROGRESS PHOTOS TAB */}
          {activeTab === 'Progress Photos' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Activity size={20} className="text-blue-500"/> Progress Photo Gallery</h2>
                <button onClick={() => setShowProgressPhotoUpload(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">+ New Session</button>
              </div>

              {progressPhotoSessions.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <Activity size={48} className="mx-auto mb-4 text-slate-300"/>
                  <p className="text-lg font-bold text-slate-500">No progress photos yet</p>
                  <p className="text-sm text-slate-400 mt-1">Upload front, side, and back photos to track physical changes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {progressPhotoSessions.map((session, i) => (
                    <div key={i} onClick={() => setInspectProgressPhoto(session)} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden cursor-pointer group hover:border-blue-300 hover:shadow-md transition">
                      <div className="aspect-square relative overflow-hidden bg-slate-200">
                        <img src={session.frontImage || session.sideImage || session.backImage} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" onError={e=>e.target.style.display='none'} />
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-slate-800">{new Date(session.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        {session.notes && <p className="text-xs text-slate-500 mt-1 truncate">{session.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'Attendance' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-indigo-500"/> Attendance Tracker</h2>
                  {member.attendanceId && <p className="text-sm text-slate-500 font-medium mt-1">Attendance ID: <span className="font-mono font-bold text-indigo-600">{member.attendanceId}</span></p>}
                </div>
              </div>

              {attendance.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <Calendar size={48} className="mx-auto mb-4 text-slate-300"/>
                  <p className="text-lg font-bold text-slate-500">No attendance records found</p>
                  {!member.attendanceId && <p className="text-sm text-amber-600 font-medium mt-2">Please set an Attendance ID in Edit Member.</p>}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Select Month</p>
                    <div className="flex flex-col gap-2">
                      {attendance.map(r => {
                        const p = r.workDays > 0 ? Math.round((r.attendDays / r.workDays) * 100) : 0;
                        const dot = p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-500' : 'bg-red-500';
                        const isActive = activeMonth === r.month;
                        return (
                          <button key={r.month} onClick={() => setActiveMonth(r.month)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'}`}>
                            <span className="font-bold">{MONTH_LABELS[r.month] || r.month}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-bold ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{p}%</span>
                              <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-white' : dot}`}/>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selAtt && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-center h-full">
                      <div className="flex flex-col items-center mb-8">
                        <div className="relative" style={{width: 140, height: 140}}>
                          <Ring pct={attPct} size={140}/>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-slate-800">{attPct}%</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attendance</span>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-slate-800 mt-4">{MONTH_LABELS[activeMonth] || activeMonth}</p>
                        {selAtt.dept && <p className="text-sm font-medium text-slate-500">{selAtt.dept} · {selAtt.shift}</p>}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[{l:'Present',v:selAtt.attendDays,c:'text-emerald-700',bg:'bg-emerald-100'},
                          {l:'Absent',v:selAtt.absentDays,c:'text-red-700',bg:'bg-red-100'},
                          {l:'Total Work',v:selAtt.workDays,c:'text-slate-800',bg:'bg-slate-200'}
                        ].map(s=>(
                          <div key={s.l} className={`text-center rounded-xl p-3 ${s.bg}`}>
                            <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      
                      {selAtt.lateTimes > 0 && (
                        <div className="mt-4 bg-amber-100 text-amber-800 p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm">
                          <span>⏰</span> Late {selAtt.lateTimes} times ({selAtt.lateMins} mins total)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* WORKOUT & DIET TAB */}
          {activeTab === 'Workout & Diet' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Workout Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
                  <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Dumbbell size={20} className="text-red-500"/> Workout Plan</h2>
                  <button onClick={() => setShowWorkout(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
                    <Upload size={14}/> {workoutPlan ? 'Re-import' : 'Import CSV'}
                  </button>
                </div>
                
                {workoutPlan ? (
                  <WorkoutDashboard plan={workoutPlan} onEdit={() => setShowWorkout(true)} onDelete={handleDeleteWorkout}/>
                ) : (
                  <div className="text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm">
                    <Dumbbell size={48} className="mx-auto mb-4 text-slate-300"/>
                    <p className="text-lg font-bold text-slate-500">No workout plan</p>
                    <p className="text-sm text-slate-400 mt-1 mb-4">Import a Mon-Sat exercise schedule.</p>
                    <button onClick={downloadWorkoutTemplate} className="text-sm font-bold text-red-600 hover:underline flex items-center justify-center gap-1 mx-auto"><Download size={14}/> Download Template</button>
                  </div>
                )}
              </div>

              {/* Diet Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
                  <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Apple size={20} className="text-green-500"/> Diet Plan</h2>
                  <div className="flex gap-2">
                    {!dietPlan && <button onClick={() => navigate('/diet-plans/new')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition">Create</button>}
                    <button onClick={() => setShowDiet(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
                      <Upload size={14}/> {dietPlan ? 'Re-import' : 'Import CSV'}
                    </button>
                  </div>
                </div>

                {dietPlan ? (
                  <DietCard plan={dietPlan} onEdit={() => navigate('/diet-plans/new', {state:{editPlan:dietPlan}})} onDelete={handleDeleteDiet}/>
                ) : (
                  <div className="text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm">
                    <Apple size={48} className="mx-auto mb-4 text-slate-300"/>
                    <p className="text-lg font-bold text-slate-500">No diet plan</p>
                    <p className="text-sm text-slate-400 mt-1 mb-4">Create manually or import from CSV.</p>
                    <button onClick={downloadDietTemplate} className="text-sm font-bold text-green-600 hover:underline flex items-center justify-center gap-1 mx-auto"><Download size={14}/> Download Template</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ADD-ONS TAB */}
          {activeTab === 'Add-ons' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-slate-800">Add-on Services</h2>
                <button onClick={openAddons} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
                  <Edit3 size={14}/> Edit Services
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['Personal Training', member.personalTraining],
                  ['Custom Workout', member.customWorkout],
                  ['Custom Diet', member.customDiet],
                  ['Rehab Therapy', member.rehabTherapy]
                ].map(([label, value]) => {
                  const isActive = value && value !== 'No';
                  return (
                    <div key={label} className={`p-4 rounded-2xl border-2 ${isActive ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                      <p className="text-sm font-bold text-slate-600">{label}</p>
                      <p className={`text-lg font-black mt-1 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>{isActive ? value : 'Not Active'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'Payments' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><CreditCard size={20} className="text-emerald-500"/> Payment History</h2>
                <button onClick={() => navigate('/payments/new')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
                  <Plus size={14}/> New Payment
                </button>
              </div>
              
              {payments.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <CreditCard size={48} className="mx-auto mb-4 text-slate-300"/>
                  <p className="text-lg font-bold text-slate-500">No payments found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="pb-3 px-4">Date</th>
                        <th className="pb-3 px-4">Package</th>
                        <th className="pb-3 px-4">Valid Period</th>
                        <th className="pb-3 px-4 text-right">Amount</th>
                        <th className="pb-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-medium">
                      {payments.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).map(p => (
                        <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-4 px-4 text-slate-600">{new Date(p.createdAt || p.issuedDate || p.startDate).toLocaleDateString('en-IN')}</td>
                          <td className="py-4 px-4 text-slate-800 font-bold">
                            {p.package}
                            {p.isRenewal && <span className="ml-2 bg-violet-100 text-violet-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Renewal</span>}
                          </td>
                          <td className="py-4 px-4 text-slate-500 text-xs">
                            {p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'} <br/>
                            to {p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-slate-800">₹{(p.finalAmount || p.amount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-4 px-4 text-right">
                            {p.balanceAmount > 0 ? (
                              <div>
                                <span className="text-red-500 font-bold">Due</span>
                                <p className="text-[10px] text-red-400">₹{p.balanceAmount.toLocaleString('en-IN')} left</p>
                              </div>
                            ) : (
                              <span className="text-emerald-500 font-bold">Paid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CAFETERIA TAB */}
          {activeTab === 'Cafeteria' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Apple size={20} className="text-orange-500"/> Cafeteria Account</h2>
                <button onClick={() => { if(cafeteriaData) setShowCafeteriaHistory(true); }} className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-sm font-bold transition">
                  View Full Report
                </button>
              </div>

              {!cafeteriaData ? (
                <p className="text-center py-10 text-slate-400 font-medium">Loading...</p>
              ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Available Balance</p>
                      <p className={`text-4xl font-black ${cafeteriaData.balance > 0 ? 'text-emerald-600' : cafeteriaData.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        ₹{Math.abs(cafeteriaData.balance || 0).toLocaleString('en-IN')}
                      </p>
                      {cafeteriaData.balance < 0 && <p className="text-sm font-bold text-red-500 mt-2">Amount Due</p>}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Transactions</p>
                    {cafeteriaData.transactions?.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                        <p className="text-sm font-medium text-slate-400">No cafeteria transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cafeteriaData.transactions.map(t => (
                          <div key={t._id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center font-bold">
                                <Apple size={20}/>
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{t.itemName || t.item?.itemName || 'Item'} <span className="text-slate-400 text-sm font-medium ml-1">x{t.quantity || 1}</span></p>
                                <p className="text-xs text-slate-400 font-medium">{new Date(t.transactionDate).toLocaleString('en-IN')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-800 text-lg">₹{(t.totalAmount || 0).toLocaleString('en-IN')}</p>
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${t.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{t.paymentStatus}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Diet Import Modal ── */}
      {showDiet && (
        <CSVImportModal
          title="Import Diet Plan CSV"
          subtitle={dietPlan ? 'Replaces existing plan' : 'Creates new diet plan'}
          accentColor="green"
          downloadTemplate={downloadDietTemplate}
          columnGuide={[
            ['goal',             'Weight Loss | Muscle Gain | Maintenance | Endurance | Custom'],
            ['calorieTarget',    'Number  e.g. 2000'],
            ['weightGoal',       'kg  e.g. 70'],
            ['waterIntake',      'Litres  e.g. 3'],
            ['protein/carbs/fats/fiber', 'Grams per day'],
            ['supplements',      'Semicolon-separated  e.g. Whey;Creatine'],
            ['breakfast_items',  'Semicolon-separated foods  e.g. Oats;Eggs'],
            ['breakfast_calories','Number'],
            ['breakfast_time',   'e.g. 08:00'],
            ['breakfast_notes',  'Optional'],
            ['...','Repeat pattern for morningSnack_ lunch_ eveningSnack_ dinner_'],
          ]}
          previewFn={(rows) => {
            const r = rows[0];
            return [
              ['Goal', r.goal], ['Calories', r.calorieTarget+' kcal'], ['Water', r.waterIntake+'L'],
              ['Macros', `P:${r.protein||0}g C:${r.carbs||0}g F:${r.fats||0}g`],
              ['Breakfast', (r.breakfast_items||'').split(';').slice(0,2).join(', ')||'—'],
              ['Lunch',     (r.lunch_items||'').split(';').slice(0,2).join(', ')||'—'],
              ['Supplements', r.supplements||'—'],
            ];
          }}
          onImport={handleDietImport}
          onClose={()=>setShowDiet(false)}
        />
      )}

      {/* ── Workout Import Modal ── */}
      {showWorkout && (
        <CSVImportModal
          title="Import Workout Plan CSV"
          subtitle={workoutPlan ? 'Replaces existing plan' : 'Creates Mon–Sat workout plan'}
          accentColor="red"
          downloadTemplate={downloadWorkoutTemplate}
          columnGuide={[
            ['goal',           'Muscle Gain | Weight Loss | Strength | Endurance | Flexibility | Custom'],
            ['notes',          'General plan notes'],
            ['day',            'monday | tuesday | wednesday | thursday | friday | saturday'],
            ['session',        'morning | evening'],
            ['exercise_name',  'e.g. Bench Press'],
            ['sets',           'Number  e.g. 4'],
            ['reps',           'e.g. 10-12 or 15'],
            ['duration',       'e.g. 30 sec or 20 min (use for cardio)'],
            ['rest',           'e.g. 60 sec'],
            ['calories',       'Calories burned  e.g. 80'],
            ['exercise_notes', 'Optional tip'],
          ]}
          previewFn={(rows) => {
            const days = [...new Set(rows.map(r=>r.day).filter(Boolean))];
            const sessions = [...new Set(rows.map(r=>r.session).filter(Boolean))];
            const morEx = rows.filter(r=>r.session==='morning').length;
            const eveEx = rows.filter(r=>r.session==='evening').length;
            const totalCal = rows.reduce((s,r)=>s+(parseInt(r.calories)||0),0);
            return [
              ['Goal',          rows[0]?.goal||'—'],
              ['Total rows',    rows.length+' exercises'],
              ['Active days',   days.join(', ')||'—'],
              ['Sessions',      sessions.join(' & ')||'—'],
              ['Morning exer.', morEx],
              ['Evening exer.', eveEx],
              ['Total cal/week',totalCal+' cal'],
            ];
          }}
          onImport={handleWorkoutImport}
          onClose={()=>setShowWorkout(false)}
        />
      )}

      {showMeasure && <EditMeasurementsModal member={member} onSave={handleSaveMeasurements} onClose={()=>setShowMeasure(false)}/>}

      {/* ── Profile Photo Lightbox ── */}
      {showPhoto && member.images?.profileImage && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={()=>setShowPhoto(false)}>
          <img src={member.images.profileImage} alt={member.name} className="max-w-full max-h-full rounded-2xl"/>
        </div>
      )}

      {/* ── BMI / Weight History Modal ── */}
      {showBmiHistory && (
        <BmiHistoryModal
          member={member}
          bmiHistory={bmiHistory}
          onClose={()=>setShowBmiHistory(false)}
          onDelete={handleDeleteBmiHistory}
        />
      )}
      {showWeightRecord && (
        <WeightRecordModal
          member={member}
          onSave={handleSaveWeightRecord}
          onClose={() => setShowWeightRecord(false)}
        />
      )}
      {showHealthModal && (
        <BloodPressureModal
          member={member}
          onSave={handleSaveHealthRecord}
          onClose={() => setShowHealthModal(false)}
        />
      )}

      {showHealthRecords && (
        <HealthRecordsModal records={healthRecords} member={member} onClose={() => setShowHealthRecords(false)} onDelete={handleDeleteHealthRecord} />
      )}

      {showCafeteriaHistory && cafeteriaData && (
        <CafeteriaHistoryModal member={member} cafeteriaData={cafeteriaData} onClose={() => setShowCafeteriaHistory(false)} />
      )}

      {/* ── Add-on Services Modal ── */}
      {showAddons && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={()=>setShowAddons(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white flex items-center justify-between">
              <p className="font-bold text-sm">Edit Add-on Services</p>
              <button onClick={()=>setShowAddons(false)}><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                ['Personal Training', 'personalTraining'],
                ['Custom Workout',    'customWorkout'],
                ['Custom Diet',       'customDiet'],
                ['Rehab Therapy',     'rehabTherapy'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="block mb-1 text-xs font-semibold text-slate-600">{label}</label>
                  <select
                    value={addonsForm[key]}
                    onChange={e => setAddonsForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border-2 border-slate-200 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setShowAddons(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleSaveAddons} disabled={addonsSaving}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                {addonsSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProgressPhotoUpload && <ProgressPhotoUploadModal onClose={() => setShowProgressPhotoUpload(false)} onUpload={handleProgressPhotoSessionUpload} />}
      {inspectProgressPhoto && <ProgressPhotoInspectModal session={inspectProgressPhoto} onClose={() => setInspectProgressPhoto(null)} onDelete={handleDeleteProgressPhoto} />}
      {inspectMeasurement && <MeasurementDetailsModal record={inspectMeasurement} onClose={() => setInspectMeasurement(null)} />}
    </div>
  );
};
// ══════════════════════════════════════════════════════════════════════════════
//  Progress Photo Upload Modal
// ══════════════════════════════════════════════════════════════════════════════
const ProgressPhotoUploadModal = ({ onClose, onUpload }) => {
  const [form, setForm] = useState({ frontImage: null, sideImage: null, backImage: null, notes: '', date: new Date().toISOString().split('T')[0] });
  const [previews, setPreviews] = useState({ frontImage: null, sideImage: null, backImage: null });
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setForm(f => ({ ...f, [type]: file }));
      setPreviews(p => ({ ...p, [type]: URL.createObjectURL(file) }));
    }
  };

  const handleSave = async () => {
    if (!form.frontImage && !form.sideImage && !form.backImage) return alert('Select at least one image');
    setUploading(true);
    const formData = new FormData();
    if (form.frontImage) formData.append('frontImage', form.frontImage);
    if (form.sideImage) formData.append('sideImage', form.sideImage);
    if (form.backImage) formData.append('backImage', form.backImage);
    if (form.notes) formData.append('notes', form.notes);
    if (form.date) formData.append('date', form.date);
    await onUpload(formData);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={!uploading ? onClose : undefined}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
          <p className="font-bold text-sm">New Progress Photo Session</p>
          {!uploading && <button onClick={onClose}><X size={16}/></button>}
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['frontImage', 'sideImage', 'backImage'].map(type => (
              <div key={type} className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{type.replace('Image', '')}</label>
                <label className="flex-1 min-h-[120px] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 overflow-hidden relative">
                  {previews[type] ? (
                    <img src={previews[type]} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400"><Upload size={20}/></span>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, type)} disabled={uploading} />
                </label>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3" disabled={uploading} />
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows="2"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={uploading}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={uploading} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={uploading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-50">
              {uploading && <RefreshCw size={14} className="animate-spin"/>}
              {uploading ? 'Uploading...' : 'Save Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  Progress Photo Inspect Modal
// ══════════════════════════════════════════════════════════════════════════════
const ProgressPhotoInspectModal = ({ session, onClose, onDelete }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-white" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div>
            <p className="font-bold text-sm">Progress Photos</p>
            <p className="text-xs opacity-60">{new Date(session.date).toLocaleDateString('en-IN')} {new Date(session.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="flex gap-2">
            {onDelete && session._id && (
              <button onClick={() => onDelete(session._id)} className="hover:bg-red-500/20 text-red-400 hover:text-red-300 p-1.5 rounded-full transition" title="Delete Session">
                <Trash2 size={16}/>
              </button>
            )}
            <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full"><X size={16}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['Front', 'Side', 'Back'].map(view => {
              const url = session[`${view.toLowerCase()}Image`];
              return (
                <div key={view} className="flex flex-col">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">{view}</p>
                  <div className="bg-black/50 rounded-xl flex-1 flex items-center justify-center min-h-[300px] overflow-hidden">
                    {url ? (
                      <img src={url} alt={view} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-slate-600 text-sm">Not provided</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {session.notes && (
            <div className="mt-5 bg-white/5 rounded-xl p-4 text-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notes</p>
              <p>{session.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  Measurement Details Modal
// ══════════════════════════════════════════════════════════════════════════════
const MeasurementDetailsModal = ({ record, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Measurement Details</p>
            <p className="text-xs opacity-60">{new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-2 border-b border-slate-100">
          {[
            { l: 'Height', v: record.height, u: 'cm' }, { l: 'Weight', v: record.weight, u: 'kg' },
            { l: 'Waist', v: record.waist, u: 'cm' }, { l: 'Hip', v: record.hip, u: 'cm' },
            { l: 'Neck', v: record.neck, u: 'cm' }, { l: 'Chest', v: record.chest, u: 'cm' },
            { l: 'Arm', v: record.arm, u: 'cm' }, { l: 'Thigh', v: record.thigh, u: 'cm' },
            { l: 'Body Fat', v: record.bodyFat, u: '%' }, { l: 'BMI', v: record.bmi, u: '' },
          ].map(m => (
            <div key={m.l} className="bg-slate-50 p-2.5 rounded-xl">
              <p className="text-[9px] font-bold uppercase text-slate-400">{m.l}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{m.v || '—'} <span className="text-xs font-normal text-slate-400">{m.v ? m.u : ''}</span></p>
            </div>
          ))}
        </div>
        {record.notes && (
          <div className="p-5 pb-2 text-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notes</p>
            <p className="text-slate-700 bg-amber-50 p-3 rounded-xl border border-amber-100">{record.notes}</p>
          </div>
        )}
        <div className="p-5 pt-4">
          <button onClick={onClose} className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200">Close</button>
        </div>
      </div>
    </div>
  );
};

export default MemberProfile;
