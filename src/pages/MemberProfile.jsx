import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import {
  ArrowLeft, Edit3, Heart, Activity, Calendar, CreditCard,
  Apple, Upload, X, Check, Scale, Plus,
  Phone, Mail, MapPin, User, RefreshCw, Download,
  Flame, Droplets, Target, Dumbbell, Sun, Moon,
  ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';

const BASE_URL = 'https://wfc-backend-server.onrender.com';

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
  const [preview, setPreview] = useState(null);
  const [rawRows, setRawRows] = useState(null);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        if (!rows.length) { setError('CSV is empty or has no data rows'); return; }
        setRawRows(rows);
        setPreview(previewFn(rows));
      } catch { setError('Could not parse CSV — check the format'); }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!rawRows) return;
    setSaving(true); setError('');
    try {
      await onImport(rawRows);
      onClose();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const bg = { green:'from-green-600 to-emerald-700', red:'from-red-600 to-rose-700' }[accentColor] || 'from-slate-700 to-slate-900';
  const ring= { green:'ring-green-400', red:'ring-red-400' }[accentColor] || 'ring-slate-400';
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

          {/* File upload */}
          <label className="block cursor-pointer">
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition ${rawRows?'border-green-400 bg-green-50':'border-slate-200 hover:border-slate-400'}`}>
              <Upload size={20} className={`mx-auto mb-2 ${rawRows?'text-green-500':'text-slate-300'}`}/>
              <p className="text-sm font-semibold text-slate-600">{rawRows?`✅ ${rawRows.length} rows loaded — ready to import`:'Click to upload CSV'}</p>
              <p className="text-[10px] text-slate-400 mt-1">.csv files only</p>
            </div>
            <input type="file" accept=".csv" className="hidden" onChange={handleFile}/>
          </label>

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
const EditMeasurementsModal = ({ member, onSave, onClose }) => {
  const [form, setForm] = useState({
    height:member.height||'',weight:member.weight||'',
    waist:member.waist||'',hip:member.hip||'',
    neck:member.neck||'',chest:member.chest||'',
    arm:member.arm||'',thigh:member.thigh||'',
  });
  const F = ({label,name,unit}) => (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" value={form[name]} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
        <span className="text-[10px] text-slate-400 w-6 shrink-0">{unit}</span>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
          <p className="font-bold text-sm">Edit Measurements</p>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <F label="Height" name="height" unit="cm"/><F label="Weight" name="weight" unit="kg"/>
          <F label="Waist"  name="waist"  unit="cm"/><F label="Hip"    name="hip"    unit="cm"/>
          <F label="Neck"   name="neck"   unit="cm"/><F label="Chest"  name="chest"  unit="cm"/>
          <F label="Arm"    name="arm"    unit="cm"/><F label="Thigh"  name="thigh"  unit="cm"/>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button onClick={()=>onSave(form)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Save</button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  Main MemberProfile Page
// ══════════════════════════════════════════════════════════════════════════════
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

  const [showDiet,      setShowDiet]      = useState(false);
  const [showWorkout,   setShowWorkout]   = useState(false);
  const [showMeasure,   setShowMeasure]   = useState(false);

  useEffect(()=>{ if(id) fetchAll(); },[id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mR, dR, wR, aR, pR] = await Promise.allSettled([
        axios.get(`https://wfc-backend-server.onrender.com/api/v1/fetchone/${id}`),
        axios.get(`https://wfc-backend-server.onrender.com/api/v1/reg-diet-plans/member/${id}`),
        axios.get(`https://wfc-backend-server.onrender.com/api/v1/reg-workout-plans/member/${id}`),
        axios.get(`https://wfc-backend-server.onrender.com/api/v1/xls-attendance/member/${id}`),
        axios.get(`https://wfc-backend-server.onrender.com/api/v1/reg-payments/member/${id}`),
      ]);
      if(mR.status==='fulfilled') setMember(mR.value.data?.data);
      if(dR.status==='fulfilled'&&dR.value.data?.success) setDietPlan(dR.value.data.plan);
      if(wR.status==='fulfilled'&&wR.value.data?.success) setWorkoutPlan(wR.value.data.plan);
      if(aR.status==='fulfilled'){
        const recs=(aR.value.data?.records||[]).sort((a,b)=>b.month.localeCompare(a.month));
        setAttendance(recs); if(recs.length>0) setActiveMonth(recs[0].month);
      }
      if(pR.status==='fulfilled') setPayments(pR.value.data?.payments||[]);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  // ── Diet import handler ─────────────────────────────────────────────────────
  const handleDietImport = async (rows) => {
    const payload = csvRowToDietPayload(rows[0], id);
    const url    = dietPlan ? `https://wfc-backend-server.onrender.com/api/v1/reg-diet-plans/${dietPlan._id}` : `https://wfc-backend-server.onrender.com/api/v1/reg-diet-plans`;
    const method = dietPlan ? 'put' : 'post';
    const res = await axios[method](url, payload);
    if (!res.data.success) throw new Error(res.data.message || 'Import failed');
    setDietPlan(res.data.plan);
  };

  // ── Workout import handler ──────────────────────────────────────────────────
  const handleWorkoutImport = async (rows) => {
    const payload = csvRowsToWorkoutPayload(rows, id);
    const url    = workoutPlan ? `https://wfc-backend-server.onrender.com/api/v1/reg-workout-plans/${workoutPlan._id}` : `https://wfc-backend-server.onrender.com/api/v1/reg-workout-plans`;
    const method = workoutPlan ? 'put' : 'post';
    const res = await axios[method](url, payload);
    if (!res.data.success) throw new Error(res.data.message || 'Import failed');
    setWorkoutPlan(res.data.plan);
  };

  const handleDeleteDiet = async () => {
    if(!dietPlan||!window.confirm('Delete diet plan?')) return;
    await axios.delete(`https://wfc-backend-server.onrender.com/api/v1/reg-diet-plans/${dietPlan._id}`);
    setDietPlan(null);
  };

  const handleDeleteWorkout = async () => {
    if(!workoutPlan||!window.confirm('Delete workout plan?')) return;
    await axios.delete(`https://wfc-backend-server.onrender.com/api/v1/reg-workout-plans/${workoutPlan._id}`);
    setWorkoutPlan(null);
  };

  const handleSaveMeasurements = async (form) => {
    const bmi=(parseFloat(form.weight)&&parseFloat(form.height))
      ?(parseFloat(form.weight)/Math.pow(parseFloat(form.height)/100,2)).toFixed(1):member.bmi;
    await axios.post(`https://wfc-backend-server.onrender.com/api/v1/update/${id}`,{
      ...member,...form,bmi,name:member.name,age:member.age,gender:member.gender,
      emails:member.emails,phone:member.phone,address:member.address,pincode:member.pincode,
      packages:member.packages,duration:member.duration,services:member.services,
      startDate:member.startDate?.split?.('T')[0],endDate:member.endDate?.split?.('T')[0],
    });
    setMember(m=>({...m,...form,bmi}));
    setShowMeasure(false);
  };

  // ── Loading / not found ─────────────────────────────────────────────────────
  if(loading) return <div className="min-h-screen bg-slate-50"><Navbar/><div className="flex items-center justify-center py-24"><RefreshCw size={24} className="animate-spin text-slate-300"/></div></div>;
  if(!member) return <div className="min-h-screen bg-slate-50"><Navbar/><div className="text-center py-24 text-slate-400"><User size={40} className="mx-auto mb-3 opacity-30"/><p>Member not found</p><button onClick={()=>navigate('/members')} className="mt-4 text-red-600 underline text-sm">← Back</button></div></div>;

  const status = getStatus(member.endDate);
  const bmi    = parseFloat(member.bmi)||0;
  const bmiCat = bmi<18.5?'Underweight':bmi<25?'Normal':bmi<30?'Overweight':'Obese';
  const bmiClr = bmi<18.5?'text-blue-600':bmi<25?'text-emerald-600':bmi<30?'text-amber-600':'text-red-600';
  const bmiPct = Math.min(100,Math.max(0,((bmi-10)/30)*100));
  const selAtt = attendance.find(r=>r.month===activeMonth);
  const attPct = selAtt?.workDays>0?Math.round((selAtt.attendDays/selAtt.workDays)*100):0;

  return (
    <div className="min-h-screen bg-slate-50">
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

        {/* 4-column grid on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* ═══ COL 1: Profile + Health + Payments ═══ */}
          <div className="space-y-4">

            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="h-20 bg-gradient-to-br from-slate-800 to-slate-900 relative">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                  <div className="w-20 h-20 rounded-full ring-4 ring-white overflow-hidden bg-slate-200 flex items-center justify-center shadow-lg">
                    {member.images?.profileImage
                      ? <img src={member.images.profileImage} alt={member.name} className="w-full h-full object-cover" onError={e=>e.target.style.display='none'}/>
                      : <span className="text-2xl font-black text-slate-600">{member.name?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                </div>
              </div>
              <div className="pt-12 pb-5 px-5 text-center">
                <h1 className="text-xl font-bold text-slate-900">{member.name}</h1>
                <p className="text-slate-400 text-sm mt-0.5">{member.gender} · {member.age} yrs · {member.bloodGroup||'—'}</p>
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}/>{status.label}
                  </span>
                  {member.attendanceId&&<span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">ID:{member.attendanceId}</span>}
                </div>
                <div className="mt-4 space-y-2 text-left">
                  {member.phone  &&<div className="flex items-center gap-2 text-xs text-slate-600"><Phone  size={11} className="text-slate-400"/>{member.phone}</div>}
                  {member.emails &&<div className="flex items-center gap-2 text-xs text-slate-600"><Mail   size={11} className="text-slate-400"/>{member.emails}</div>}
                  {member.address&&<div className="flex items-center gap-2 text-xs text-slate-600"><MapPin size={11} className="text-slate-400"/>{member.address}</div>}
                </div>
              </div>
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Membership</p>
                <div className="space-y-1.5">
                  {[['Package',member.packages],['Duration',member.duration?`${member.duration} month(s)`:'—'],
                    ['Start',member.startDate?new Date(member.startDate).toLocaleDateString('en-IN'):'—'],
                    ['End',member.endDate?new Date(member.endDate).toLocaleDateString('en-IN'):'—'],
                    ['Services',member.services]
                  ].map(([l,v])=>(
                    <div key={l} className="flex justify-between text-xs">
                      <span className="text-slate-400">{l}</span>
                      <span className="font-semibold text-slate-700">{v||'—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Health */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3"><Heart size={13} className="text-red-500"/><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Health</p></div>
              <div className="grid grid-cols-2 gap-3">
                {[['Blood Group',member.bloodGroup],['BP',member.bloodPressure],
                  ['Sugar',member.sugarLevel?`${member.sugarLevel} mg/dL`:null],['Issues',member.issues||'None']
                ].map(([l,v])=>(
                  <div key={l}><p className="text-[9px] text-slate-400 uppercase">{l}</p><p className="text-sm font-bold text-slate-800">{v||'—'}</p></div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><CreditCard size={13} className="text-slate-500"/><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payments</p></div>
                <button onClick={()=>navigate('/payments/new')} className="flex items-center gap-1 text-xs text-red-600 font-semibold"><Plus size={11}/>New</button>
              </div>
              {payments.length===0
                ?<p className="text-xs text-slate-400 text-center py-3">No payments yet</p>
                :<div className="space-y-2">{payments.slice(0,4).map(p=>(
                  <div key={p._id} className="flex items-center justify-between">
                    <div><p className="text-xs font-semibold text-slate-800">{p.package}</p><p className="text-[10px] text-slate-400">{p.startDate?new Date(p.startDate).toLocaleDateString('en-IN'):'—'}</p></div>
                    <div className="text-right"><p className="text-xs font-bold text-emerald-600">₹{(p.finalAmount||p.amount||0).toLocaleString('en-IN')}</p>{p.balanceAmount>0&&<p className="text-[10px] text-red-500 font-semibold">-₹{p.balanceAmount.toLocaleString('en-IN')} due</p>}</div>
                  </div>
                ))}</div>
              }
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3"><Activity size={13} className="text-slate-500"/><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress Photos</p></div>
              <div className="grid grid-cols-3 gap-2">
                <BodyTile src={member.images?.frontBodyImage} label="Front"/>
                <BodyTile src={member.images?.sideBodyImage}  label="Side"/>
                <BodyTile src={member.images?.backBodyImage}  label="Back"/>
              </div>
            </div>
          </div>

          {/* ═══ COL 2: Measurements + Attendance ═══ */}
          <div className="space-y-4">

            {/* Measurements */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Scale size={13} className="text-slate-500"/><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Measurements</p></div>
                <button onClick={()=>setShowMeasure(true)} className="flex items-center gap-1 text-xs text-red-600 font-semibold"><Edit3 size={11}/>Edit</button>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-3">
                <div className="relative shrink-0" style={{width:56,height:56}}>
                  <Ring pct={bmiPct} size={56}/>
                  <div className="absolute inset-0 flex items-center justify-center"><span className={`text-xs font-black ${bmiClr}`}>{bmi||'—'}</span></div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">BMI</p>
                  <p className={`font-bold text-sm ${bmiClr}`}>{bmiCat}</p>
                  {member.bodyFat&&<p className="text-[10px] text-slate-400">Body fat: {member.bodyFat}%</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[['Height',member.height,'cm'],['Weight',member.weight,'kg'],
                  ['Waist',member.waist,'cm'],['Hip',member.hip,'cm'],
                  ['Neck',member.neck,'cm'],['Chest',member.chest,'cm'],
                  ['Arm',member.arm,'cm'],['Thigh',member.thigh,'cm']
                ].filter(([,v])=>v).map(([l,v,u])=>(
                  <div key={l} className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-[9px] text-slate-400 uppercase">{l}</p>
                    <p className="text-sm font-bold text-slate-800">{v} <span className="text-[10px] font-normal text-slate-400">{u}</span></p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Calendar size={13} className="text-slate-500"/><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance</p></div>
                {member.attendanceId&&<span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">ID:{member.attendanceId}</span>}
              </div>
              {attendance.length===0
                ?<div className="text-center py-5 text-slate-400"><Calendar size={24} className="mx-auto mb-2 opacity-20"/><p className="text-xs">No records found</p>{!member.attendanceId&&<p className="text-[10px] mt-1 text-amber-600">Set Attendance ID in Edit Member</p>}</div>
                :<>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {attendance.map(r=>{
                      const p=r.workDays>0?Math.round((r.attendDays/r.workDays)*100):0;
                      const dot=p>=80?'bg-emerald-500':p>=50?'bg-amber-500':'bg-red-500';
                      return(
                        <button key={r.month} onClick={()=>setActiveMonth(r.month)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${activeMonth===r.month?'bg-slate-800 text-white border-slate-800':'bg-white text-slate-500 border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeMonth===r.month?'bg-white':dot}`}/>
                          {MONTH_LABELS[r.month]||r.month}
                        </button>
                      );
                    })}
                  </div>
                  {selAtt&&(
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative shrink-0" style={{width:56,height:56}}>
                          <Ring pct={attPct} size={56}/>
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-black text-slate-700">{attPct}%</span></div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{selAtt.attendDays} of {selAtt.workDays} days</p>
                          {selAtt.dept&&<p className="text-[10px] text-slate-400">{selAtt.dept} · {selAtt.shift}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[{l:'Present',v:selAtt.attendDays,c:'text-emerald-600',bg:'bg-emerald-50'},
                          {l:'Absent',v:selAtt.absentDays,c:'text-red-500',bg:'bg-red-50'},
                          {l:'Work',v:selAtt.workDays,c:'text-slate-700',bg:'bg-white'}
                        ].map(s=>(
                          <div key={s.l} className={`text-center rounded-lg py-2 ${s.bg}`}>
                            <p className={`text-base font-black ${s.c}`}>{s.v}</p>
                            <p className="text-[9px] text-slate-400">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      {selAtt.lateTimes>0&&<p className="text-[10px] text-amber-600 font-semibold mt-2">⏰ Late {selAtt.lateTimes}× ({selAtt.lateMins} min)</p>}
                    </div>
                  )}
                </>
              }
            </div>
          </div>

          {/* ═══ COL 3: Diet Plan ═══ */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Apple size={13} className="text-green-500"/><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diet Plan</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setShowDiet(true)}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-green-700 transition">
                    <Upload size={11}/> {dietPlan?'Re-import':'Import CSV'}
                  </button>
                  {!dietPlan&&<button onClick={()=>navigate('/diet-plans/new')} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-slate-200"><Plus size={11}/>Create</button>}
                </div>
              </div>
              {dietPlan
                ?<DietCard plan={dietPlan} onEdit={()=>navigate('/diet-plans/new',{state:{editPlan:dietPlan}})} onDelete={handleDeleteDiet}/>
                :<div className="text-center py-8 text-slate-400">
                  <Apple size={32} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-sm font-medium">No diet plan yet</p>
                  <p className="text-[11px] mt-1 mb-3">Import a CSV or create manually</p>
                  <button onClick={downloadDietTemplate} className="flex items-center gap-1 text-[11px] text-green-600 font-semibold mx-auto hover:underline"><Download size={11}/>Download CSV template</button>
                </div>
              }
            </div>
          </div>

          {/* ═══ COL 4: Workout Plan ═══ */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Dumbbell size={13} className="text-red-500"/><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workout Plan</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setShowWorkout(true)}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-red-700 transition">
                    <Upload size={11}/> {workoutPlan?'Re-import':'Import CSV'}
                  </button>
                </div>
              </div>
              {workoutPlan
                ?<WorkoutDashboard plan={workoutPlan} onEdit={()=>setShowWorkout(true)} onDelete={handleDeleteWorkout}/>
                :<div className="text-center py-8 text-slate-400">
                  <Dumbbell size={32} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-sm font-medium">No workout plan yet</p>
                  <p className="text-[11px] mt-1 mb-3">Import a CSV with Mon–Sat exercises</p>
                  <button onClick={downloadWorkoutTemplate} className="flex items-center gap-1 text-[11px] text-red-600 font-semibold mx-auto hover:underline"><Download size={11}/>Download CSV template</button>
                </div>
              }
            </div>

            {/* Add-ons */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Add-on Services</p>
              <div className="space-y-2">
                {[['Personal Training',member.personalTraining],['Custom Workout',member.customWorkout],
                  ['Custom Diet',member.customDiet],['Rehab Therapy',member.rehabTherapy]
                ].map(([l,v])=>(
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{l}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v&&v!=='No'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-400'}`}>{(v&&v!=='No')?v:'No'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
    </div>
  );
};

export default MemberProfile;
