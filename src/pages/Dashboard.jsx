import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import {
  Users, TrendingUp, AlertTriangle, Clock, CreditCard,
  X, Bell, CheckCircle, Salad, Wallet,
  Plus, Activity, RefreshCw, Edit3, Trash2, Megaphone,
  Calendar, Flame, Droplets, Target, Dumbbell, Star
} from 'lucide-react';

const getMemberStatus = (endDate) => {
  if (!endDate) return 'expired';
  const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000);
  if (diff < 0)  return 'expired';
  if (diff <= 7) return 'expiring';
  return 'active';
};
const isThisMonth = (d) => { if (!d) return false; const t = new Date(d), n = new Date(); return t.getMonth()===n.getMonth()&&t.getFullYear()===n.getFullYear(); };

const MemberModal = ({ title, members, color, onClose }) => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[75vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()} style={{animation:'su .2s ease'}}>
        <div className={`px-5 py-4 flex items-center justify-between ${color.hBg}`}>
          <p className={`font-bold text-sm ${color.hTxt}`}>{title} <span className="opacity-60 font-normal">({members.length})</span></p>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10"><X size={15}/></button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
          {members.length===0 ? (
            <div className="text-center py-10 text-slate-400"><Users size={28} className="mx-auto mb-2 opacity-25"/><p className="text-xs">No members</p></div>
          ) : members.map(m => {
            const diff = m.endDate ? Math.ceil((new Date(m.endDate)-new Date())/86400000) : null;
            return (
              <div key={m._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{m.name?.[0]?.toUpperCase()||'?'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                  <p className="text-[11px] text-slate-400">{m.phone}</p>
                </div>
                {diff!==null&&<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${diff<0?'bg-red-100 text-red-600':diff<=7?'bg-amber-100 text-amber-600':'bg-green-100 text-green-600'}`}>
                  {diff<0?`${Math.abs(diff)}d over`:diff===0?'Today':`${diff}d`}
                </span>}
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t">
          <button onClick={()=>{navigate('/members');onClose();}} className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition">View All Members →</button>
        </div>
      </div>
      <style>{`@keyframes su{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

const AddReminderModal = ({ onSave, onClose }) => {
  const [text, setText] = useState('');
  const [type, setType] = useState('note');
  const TYPES = [
    { id: 'note',    label: '📝 Note',    color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'urgent',  label: '🚨 Urgent',  color: 'bg-red-100 text-red-700 border-red-300' },
    { id: 'diet',    label: '🥗 Diet',    color: 'bg-green-100 text-green-700 border-green-300' },
    { id: 'payment', label: '💰 Payment', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  ];
  const save = () => {
    if (!text.trim()) return;
    onSave({ id: Date.now().toString(), text: text.trim(), type, createdAt: new Date().toISOString() });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e=>e.stopPropagation()} style={{animation:'su .2s ease'}}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="font-bold text-sm text-slate-800">Add Reminder</p>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X size={15}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Type</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.id} onClick={()=>setType(t.id)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${type===t.id ? t.color+' scale-[1.02] shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Note</p>
            <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&e.metaKey)save();}} autoFocus rows={3}
              placeholder="e.g. Call Ravi for renewal..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"/>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
            <button onClick={save} disabled={!text.trim()} className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-40">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RC = {
  note:    { bg:'bg-blue-50',   border:'border-blue-200',   icon:'text-blue-500',   title:'text-blue-800' },
  urgent:  { bg:'bg-red-50',    border:'border-red-200',    icon:'text-red-500',    title:'text-red-800'  },
  diet:    { bg:'bg-green-50',  border:'border-green-200',  icon:'text-green-600',  title:'text-green-800'},
  payment: { bg:'bg-amber-50',  border:'border-amber-200',  icon:'text-amber-600',  title:'text-amber-800'},
  auto:    { bg:'bg-slate-50',  border:'border-slate-200',  icon:'text-slate-500',  title:'text-slate-700'},
};
const TYPE_ICON = { note: Edit3, urgent: AlertTriangle, diet: Salad, payment: Wallet, auto: Bell };

const LineChart = ({ members }) => {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !members.length) return;

    const now  = new Date();
    const days = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (27 - i));
      return d;
    });

    const getCount = (daysArr, monthOffset, field) => {
      return daysArr.map(day => {
        const target = new Date(day);
        target.setMonth(target.getMonth() + monthOffset);
        return members.filter(m => {
          const val = m[field];
          if (!val) return false;
          const d = new Date(val);
          return d.getDate() === target.getDate() &&
                 d.getMonth() === target.getMonth() &&
                 d.getFullYear() === target.getFullYear();
        }).length;
      });
    };

    const thisMonthJoined = getCount(days, 0, 'createdAt');
    const lastMonthJoined = getCount(days, -1, 'createdAt');

    const labels = days.map(d => {
      const day = d.getDate();
      return day === 1 || day % 7 === 0 ? `${d.getDate()}` : '';
    });

    if (chartRef.current) { chartRef.current.destroy(); }

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'This Month',
            data: thisMonthJoined,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220,38,38,0.08)',
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#dc2626',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Last Month',
            data: lastMonthJoined,
            borderColor: '#94a3b8',
            backgroundColor: 'rgba(148,163,184,0.06)',
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: '#94a3b8',
            tension: 0.4,
            fill: true,
            borderDash: [5, 3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#fff',
            bodyColor: '#94a3b8',
            padding: 10,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} new members`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11 }, maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11 }, stepSize: 1, precision: 0 },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [members]);

  const now = new Date();
  const lm  = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const tmName = now.toLocaleString('en-IN',{month:'long'});
  const lmName = lm.toLocaleString('en-IN',{month:'long'});

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-slate-800 text-sm">📈 New Members — Day by Day</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Comparing daily joins: {lmName} vs {tmName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-6 h-0.5 bg-red-600 inline-block rounded"></span> {tmName}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-6 border-t-2 border-dashed border-slate-400 inline-block"></span> {lmName}
          </span>
        </div>
      </div>
      <div style={{ position: 'relative', height: '180px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};


const AttRing = ({ pct, size = 56 }) => {
  const r = (size - 10) / 2, circ = 2 * Math.PI * r;
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"/>
    </svg>
  );
};

const GOAL_CLR = {
  'Weight Loss':'bg-blue-100 text-blue-700','Muscle Gain':'bg-red-100 text-red-700',
  'Maintenance':'bg-green-100 text-green-700','Endurance':'bg-amber-100 text-amber-700',
  'Custom':'bg-violet-100 text-violet-700',
};

const WK_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday'];

const fmtMonth = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
};

const MemberDashboard = ({ user }) => {
  const navigate      = useNavigate();
  const [member,      setMember]      = useState(null);
  const [dietPlan,    setDietPlan]    = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [attendance,  setAttendance]  = useState([]);
  const [payments,    setPayments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeMonth, setActiveMonth] = useState(null);
  const [notLinked,   setNotLinked]   = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let regId = user.registrationId || null;
      if (!regId && user.phone) {
        const allRes = await CustomBaseUrl.get(`/fetch`);
        const matched = (allRes.data?.data || []).find(m => m.phone === user.phone);
        regId = matched?._id || null;
      }
      if (!regId) { setNotLinked(true); setLoading(false); return; }

      const [mR, dR, wR, aR, pR] = await Promise.allSettled([
        CustomBaseUrl.get(`/fetchone/${regId}`),
        CustomBaseUrl.get(`/reg-diet-plans/member/${regId}`),
        CustomBaseUrl.get(`/reg-workout-plans/member/${regId}`),
        CustomBaseUrl.get(`/xls-attendance/member/${regId}`),
        CustomBaseUrl.get(`/reg-payments/member/${regId}`),
      ]);
      if (mR.status === 'fulfilled') setMember(mR.value.data?.data);
      if (dR.status === 'fulfilled' && dR.value.data?.success) setDietPlan(dR.value.data.plan);
      if (wR.status === 'fulfilled' && wR.value.data?.success) setWorkoutPlan(wR.value.data.plan);
      if (aR.status === 'fulfilled') {
        const recs = (aR.value.data?.records || []).sort((a, b) => b.month.localeCompare(a.month));
        setAttendance(recs);
        if (recs.length > 0) setActiveMonth(recs[0].month);
      }
      if (pR.status === 'fulfilled') setPayments(pR.value.data?.payments || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Computed values ──────────────────────────────────────────
  const selAtt     = attendance.find(r => r.month === activeMonth);
  const attPct     = selAtt?.workDays > 0 ? Math.round((selAtt.attendDays / selAtt.workDays) * 100) : 0;
  const totalPaid  = payments.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0);
  const totalDue   = payments.reduce((s, p) => s + (p.balanceAmount || 0), 0);
  const daysLeft   = member?.endDate ? Math.ceil((new Date(member.endDate) - new Date()) / 86400000) : null;
  const memStatus  = daysLeft === null ? 'unknown' : daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'expiring' : 'active';
  const bmi        = parseFloat(member?.bmi) || 0;
  const bmiCat     = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiClr     = bmi < 18.5 ? 'text-blue-600' : bmi < 25 ? 'text-emerald-600' : bmi < 30 ? 'text-amber-600' : 'text-red-600';
  const bmiPct     = Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100));
  const overallAtt = attendance.length > 0
    ? Math.round(attendance.reduce((s, r) => s + (r.workDays > 0 ? r.attendDays / r.workDays : 0), 0) / attendance.length * 100)
    : 0;
  const wkExercises = WK_DAYS.reduce((s, d) => s + (workoutPlan?.[d]?.morning?.exercises?.length || 0) + (workoutPlan?.[d]?.evening?.exercises?.length || 0), 0);
  const wkActiveDays = WK_DAYS.filter(d => (workoutPlan?.[d]?.morning?.exercises?.length || 0) + (workoutPlan?.[d]?.evening?.exercises?.length || 0) > 0).length;

  const STATUS_BADGE = {
    active:   { cls:'bg-emerald-100 text-emerald-700', dot:'bg-emerald-500', label:'Active' },
    expiring: { cls:'bg-amber-100 text-amber-700',     dot:'bg-amber-500',   label:`${daysLeft}d left` },
    expired:  { cls:'bg-red-100 text-red-700',         dot:'bg-red-500',     label:'Expired' },
    unknown:  { cls:'bg-slate-100 text-slate-500',     dot:'bg-slate-400',   label:'Unknown' },
  }[memStatus];

  const displayName = member?.name || user.name || 'Member';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Greeting bar ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {new Date().getHours()<12?'Good Morning 🌅':new Date().getHours()<17?'Good Afternoon ☀️':'Good Evening 🌙'}&nbsp;
              <span className="text-red-600">{displayName}</span> 👋
            </h1>
            <p className="text-xs text-slate-400">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>

        {/* ── Loading skeleton ── */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-36 bg-white rounded-2xl animate-pulse border border-slate-100"/>
            <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_,i)=><div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-slate-100"/>)}</div>
            <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="h-56 bg-white rounded-2xl animate-pulse border border-slate-100"/>)}</div>
            <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-slate-100"/>)}</div>
          </div>

        ) : notLinked ? (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-10 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} className="text-amber-500"/>
            </div>
            <p className="font-bold text-slate-800 mb-1">Gym profile not linked yet</p>
            <p className="text-xs text-slate-500">Your login account (<strong>{user.phone}</strong>) has no matching gym registration. Ask your admin to register you with this phone number.</p>
          </div>

        ) : (<>

          {/* ═══ PROFILE HERO ═══ */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-red-800 px-5 py-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full ring-4 ring-white/20 bg-red-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white">{displayName}</h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_BADGE.dot}`}/>{STATUS_BADGE.label}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {[member?.age && `${member.age} yrs`, member?.gender, member?.profession].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Membership</p>
                  <p className="text-xs font-bold text-slate-800">{member?.packages || '—'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{member?.services || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Period</p>
                  <p className="text-[11px] font-semibold text-slate-800">{member?.startDate ? new Date(member.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}</p>
                  <p className="text-[10px] text-slate-400">→ {member?.endDate ? new Date(member.endDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Health</p>
                  <p className="text-[11px] font-semibold text-slate-800">Blood: {member?.bloodGroup || '—'}</p>
                  <p className="text-[10px] text-slate-400">BP: {member?.bloodPressure || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contact</p>
                  <p className="text-[11px] font-semibold text-slate-800">{member?.phone || '—'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{member?.emails || user.email || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ QUICK STATS ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label:'Days Remaining', value: daysLeft === null ? '—' : daysLeft < 0 ? 'Expired' : `${daysLeft} days`,
                emoji:'📅', bg: daysLeft === null ? 'bg-slate-100' : daysLeft < 0 ? 'bg-red-50' : daysLeft <= 7 ? 'bg-amber-50' : 'bg-emerald-50',
                vc: daysLeft === null ? 'text-slate-600' : daysLeft < 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-emerald-700' },
              { label:'Overall Attendance', value: attendance.length > 0 ? `${overallAtt}%` : '—',
                emoji:'📊', bg: overallAtt >= 80 ? 'bg-emerald-50' : overallAtt >= 50 ? 'bg-amber-50' : attendance.length > 0 ? 'bg-red-50' : 'bg-slate-50',
                vc: overallAtt >= 80 ? 'text-emerald-700' : overallAtt >= 50 ? 'text-amber-600' : 'text-red-600' },
              { label:'Balance Due', value: totalDue > 0 ? `₹${totalDue.toLocaleString('en-IN')}` : 'All Clear',
                emoji:'💰', bg: totalDue > 0 ? 'bg-red-50' : 'bg-emerald-50',
                vc: totalDue > 0 ? 'text-red-600' : 'text-emerald-700' },
              { label:'BMI', value: bmi > 0 ? `${bmi} — ${bmiCat}` : '—',
                emoji:'⚖️', bg:'bg-violet-50', vc: bmi > 0 ? bmiClr : 'text-slate-500' },
            ].map(({ label, value, emoji, bg, vc }) => (
              <div key={label} className={`${bg} rounded-xl p-3.5 flex items-center gap-3`}>
                <span className="text-2xl leading-none">{emoji}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-black leading-tight truncate ${vc}`}>{value}</p>
                  <p className="text-[10px] text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ═══ CALORIE TRACKER CARD ═══ */}
          {(() => {
            const todayK = new Date().toISOString().slice(0, 10);
            const logs   = (() => { try { return JSON.parse(localStorage.getItem('wfc_diet_logs') || '{}'); } catch { return {}; } })();
            const plan   = (() => { try { return JSON.parse(localStorage.getItem('wfc_diet_plan') || 'null'); } catch { return null; } })();
            const target = plan?.calorieTarget || dietPlan?.calorieTarget || 2000;
            const entries = logs[todayK] || [];
            const consumed = entries.reduce((s, e) => s + (e.calories || 0), 0);
            const pct      = Math.min((consumed / target) * 100, 100);
            const over     = consumed > target;
            const low      = consumed > 0 && consumed < target * 0.5;
            const barColor = over ? 'bg-red-500' : low ? 'bg-amber-400' : consumed > 0 ? 'bg-green-500' : 'bg-slate-200';
            const status   = over ? `⚠️ Over by ${consumed - target} kcal` : low ? '🔻 Low intake' : consumed > 0 ? `✅ ${target - consumed} kcal remaining` : 'No food logged yet';
            const statusCl = over ? 'text-red-600' : low ? 'text-amber-600' : consumed > 0 ? 'text-green-700' : 'text-slate-400';
            return (
              <button onClick={() => navigate('/diet-log')}
                className="w-full mb-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">🔥</span>
                    <p className="text-sm font-bold text-slate-800">Today's Calories</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${over ? 'bg-red-100 text-red-700' : low ? 'bg-amber-100 text-amber-700' : consumed > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {consumed} / {target} kcal
                    </span>
                    <span className="text-xs text-slate-400 group-hover:text-slate-700 transition">Track →</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className={`h-2 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <p className={`text-xs font-semibold ${statusCl}`}>{status}</p>
              </button>
            );
          })()}

          {/* ═══ MAIN 3 CARDS ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

            {/* Attendance Scoreboard */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} className="text-blue-500"/>
                <p className="font-bold text-slate-800 text-sm">Attendance</p>
                {attendance.length > 0 && <span className="ml-auto text-[10px] text-slate-400">{attendance.length} month{attendance.length > 1 ? 's' : ''}</span>}
              </div>
              {attendance.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Calendar size={28} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-xs">No records yet</p>
                </div>
              ) : (<>
                <div className="flex flex-wrap gap-1 mb-3">
                  {attendance.map(r => {
                    const p = r.workDays > 0 ? Math.round((r.attendDays / r.workDays) * 100) : 0;
                    const dot = p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <button key={r.month} onClick={() => setActiveMonth(r.month)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${activeMonth === r.month ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeMonth === r.month ? 'bg-white' : dot}`}/>
                        {fmtMonth(r.month)}
                      </button>
                    );
                  })}
                </div>
                {selAtt && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative shrink-0" style={{width:56,height:56}}>
                        <AttRing pct={attPct}/>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-black text-slate-700">{attPct}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{selAtt.attendDays} / {selAtt.workDays} days</p>
                        {selAtt.dept && <p className="text-[10px] text-slate-400">{selAtt.dept} · {selAtt.shift}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {[
                        {l:'Present', v:selAtt.attendDays, c:'text-emerald-600', bg:'bg-emerald-50'},
                        {l:'Absent',  v:selAtt.absentDays, c:'text-red-500',     bg:'bg-red-50'},
                        {l:'Work',    v:selAtt.workDays,   c:'text-slate-700',   bg:'bg-white'},
                      ].map(s => (
                        <div key={s.l} className={`text-center rounded-lg py-2 ${s.bg}`}>
                          <p className={`text-base font-black ${s.c}`}>{s.v}</p>
                          <p className="text-[9px] text-slate-400">{s.l}</p>
                        </div>
                      ))}
                    </div>
                    {selAtt.lateTimes > 0 && <p className="text-[10px] text-amber-600 font-semibold">⏰ Late {selAtt.lateTimes}× · {selAtt.lateMins} min</p>}
                    {selAtt.otHours  > 0 && <p className="text-[10px] text-violet-600 font-semibold mt-0.5">⭐ OT: {selAtt.otHours} hrs</p>}
                  </div>
                )}
              </>)}
            </div>

            {/* Diet Plan */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Salad size={14} className="text-green-500"/>
                <p className="font-bold text-slate-800 text-sm">Diet Plan</p>
              </div>
              {!dietPlan ? (
                <div className="text-center py-8 text-slate-400">
                  <Salad size={28} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-xs">No diet plan yet</p>
                  <p className="text-[10px] mt-1 text-slate-400">Ask your trainer to assign one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${GOAL_CLR[dietPlan.goal] || 'bg-slate-100 text-slate-600'}`}>{dietPlan.goal || 'Maintenance'}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-600"><Flame size={11}/>{dietPlan.calorieTarget || 0} kcal</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[{l:'Protein',v:dietPlan.protein,c:'bg-blue-50 text-blue-700'},{l:'Carbs',v:dietPlan.carbs,c:'bg-amber-50 text-amber-700'},{l:'Fats',v:dietPlan.fats,c:'bg-red-50 text-red-700'},{l:'Fiber',v:dietPlan.fiber,c:'bg-green-50 text-green-700'}].map(({l,v,c})=>(
                      <div key={l} className={`text-center rounded-lg py-1.5 ${c}`}>
                        <p className="text-xs font-black leading-none">{v||0}g</p>
                        <p className="text-[8px] opacity-70 mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[{key:'breakfast',emoji:'🌅',label:'Break'},{key:'morningSnack',emoji:'🍎',label:'AM'},{key:'lunch',emoji:'☀️',label:'Lunch'},{key:'eveningSnack',emoji:'🍵',label:'PM'},{key:'dinner',emoji:'🌙',label:'Din'}].map(({key,emoji,label})=>{
                      const meal=dietPlan[key]; const has=meal?.items?.length>0;
                      return (
                        <div key={key} className={`text-center rounded-lg py-1.5 ${has?'bg-slate-800 text-white':'bg-slate-100 text-slate-400'}`}>
                          <p className="text-xs leading-none">{emoji}</p>
                          <p className="text-[8px] font-bold mt-0.5">{label}</p>
                          {has&&<p className="text-[8px] opacity-60">{meal.calories}cal</p>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dietPlan.waterIntake && <span className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full"><Droplets size={9}/>Water {dietPlan.waterIntake}L</span>}
                    {dietPlan.weightGoal  && <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full"><Target size={9}/>Target {dietPlan.weightGoal}kg</span>}
                  </div>
                  {dietPlan.supplements?.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Supplements</p>
                      <div className="flex flex-wrap gap-1">{dietPlan.supplements.map((s,i)=><span key={i} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-medium">{s}</span>)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payments */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={14} className="text-violet-500"/>
                <p className="font-bold text-slate-800 text-sm">Payments</p>
                {payments.length > 0 && <span className="ml-auto text-[10px] text-slate-400">{payments.length} record{payments.length > 1 ? 's' : ''}</span>}
              </div>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CreditCard size={28} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-xs">No payment records yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 bg-emerald-50 rounded-xl p-2.5 text-center">
                      <p className="text-sm font-black text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</p>
                      <p className="text-[9px] text-emerald-600">Total Paid</p>
                    </div>
                    <div className={`flex-1 rounded-xl p-2.5 text-center ${totalDue > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                      <p className={`text-sm font-black ${totalDue > 0 ? 'text-red-600' : 'text-slate-400'}`}>{totalDue > 0 ? `₹${totalDue.toLocaleString('en-IN')}` : '✓'}</p>
                      <p className={`text-[9px] ${totalDue > 0 ? 'text-red-500' : 'text-slate-400'}`}>{totalDue > 0 ? 'Balance Due' : 'All Clear'}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {payments.map(p => (
                      <div key={p._id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{p.package || '—'}</p>
                          <p className="text-[10px] text-slate-400">{p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-600">₹{(p.finalAmount || p.amount || 0).toLocaleString('en-IN')}</p>
                          {p.balanceAmount > 0 && <p className="text-[10px] text-red-500 font-semibold">-₹{p.balanceAmount.toLocaleString('en-IN')} due</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ BOTTOM ROW ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Body Stats */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-slate-500"/>
                <p className="font-bold text-slate-800 text-sm">Body Stats</p>
              </div>
              {bmi > 0 && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 mb-3">
                  <div className="relative shrink-0" style={{width:52,height:52}}>
                    <AttRing pct={bmiPct} size={52}/>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[11px] font-black ${bmiClr}`}>{bmi}</span>
                    </div>
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${bmiClr}`}>{bmiCat}</p>
                    <p className="text-[10px] text-slate-400">BMI Index</p>
                    {member?.bodyFat && <p className="text-[10px] text-slate-400">Body fat: {member.bodyFat}%</p>}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {[['Height',member?.height,'cm'],['Weight',member?.weight,'kg'],['Waist',member?.waist,'cm'],['Hip',member?.hip,'cm'],['Neck',member?.neck,'cm'],['Chest',member?.chest,'cm'],['Arm',member?.arm,'cm'],['Thigh',member?.thigh,'cm']].filter(([,v])=>v).map(([l,v,u])=>(
                  <div key={l} className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-[9px] text-slate-400 uppercase">{l}</p>
                    <p className="text-sm font-bold text-slate-800">{v} <span className="text-[10px] font-normal text-slate-400">{u}</span></p>
                  </div>
                ))}
                {bmi === 0 && !member?.height && !member?.weight && (
                  <p className="text-xs text-slate-400 col-span-2 text-center py-4 opacity-60">No measurements recorded yet</p>
                )}
              </div>
            </div>

            {/* Workout Plan */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell size={14} className="text-red-500"/>
                <p className="font-bold text-slate-800 text-sm">Workout Plan</p>
              </div>
              {!workoutPlan ? (
                <div className="text-center py-8 text-slate-400">
                  <Dumbbell size={28} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-xs">No workout plan yet</p>
                  <p className="text-[10px] mt-1 text-slate-400">Ask your trainer to assign one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${GOAL_CLR[workoutPlan.goal] || 'bg-slate-100 text-slate-600'}`}>{workoutPlan.goal}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {l:'Weekly Cal', v:workoutPlan.totalWeeklyCalories||0, c:'bg-orange-50 text-orange-600'},
                      {l:'Exercises',  v:wkExercises,                        c:'bg-slate-100 text-slate-700'},
                      {l:'Active Days',v:`${wkActiveDays}/6`,                c:'bg-blue-50 text-blue-600'},
                    ].map(({l,v,c})=>(
                      <div key={l} className={`text-center rounded-xl p-2 ${c}`}>
                        <p className="text-sm font-black leading-none">{v}</p>
                        <p className="text-[9px] mt-0.5 opacity-80">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {WK_DAYS.map(d => {
                      const total = (workoutPlan[d]?.morning?.exercises?.length||0) + (workoutPlan[d]?.evening?.exercises?.length||0);
                      return (
                        <div key={d} className={`text-center rounded-lg py-1.5 ${total>0?'bg-slate-800 text-white':'bg-slate-100 text-slate-400'}`}>
                          <p className="text-[9px] font-bold capitalize">{d.slice(0,3)}</p>
                          <p className="text-[8px] mt-0.5 opacity-70">{total>0?`${total}ex`:'rest'}</p>
                        </div>
                      );
                    })}
                  </div>
                  {workoutPlan.notes && <p className="text-[10px] text-slate-400 italic">📝 {workoutPlan.notes}</p>}
                </div>
              )}
            </div>

            {/* Add-ons & Health */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star size={14} className="text-amber-500"/>
                <p className="font-bold text-slate-800 text-sm">Add-on Services</p>
              </div>
              <div className="space-y-2 mb-4">
                {[['💪 Personal Training',member?.personalTraining],['🏋️ Custom Workout',member?.customWorkout],['🥗 Custom Diet',member?.customDiet],['🧘 Rehab Therapy',member?.rehabTherapy]].map(([l,v])=>(
                  <div key={l} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-600">{l}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v&&v!=='No'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-400'}`}>{v&&v!=='No'?v:'No'}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Health Info</p>
                <div className="space-y-1.5">
                  {[['Blood Group',member?.bloodGroup],['Blood Pressure',member?.bloodPressure],['Sugar Level',member?.sugarLevel?`${member.sugarLevel} mg/dL`:null],['Issues',member?.issues&&member.issues!=='None'?member.issues:null],['Address',member?.address]].filter(([,v])=>v).map(([l,v])=>(
                    <div key={l} className="flex justify-between text-xs gap-2">
                      <span className="text-slate-400 shrink-0">{l}</span>
                      <span className="font-semibold text-slate-700 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </>)}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [members,  setMembers]  = useState([]);
  const [leadStats,setLeadStats]= useState({ total:0, new:0, converted:0, interested:0 });
  const [payments, setPayments] = useState([]);
  const [dietPlans,setDietPlans]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  const [manualNotes, setManualNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wfc_manual_notes')||'[]'); } catch { return []; }
  });
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wfc_dismissed')||'[]'); } catch { return []; }
  });

  useEffect(() => {
    fetchAll();
    if (!window.Chart) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = () => setChartReady(true);
      document.head.appendChild(s);
    } else {
      setChartReady(true);
    }
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mR,pR,dR,lR] = await Promise.allSettled([
        CustomBaseUrl.get(`/fetch`),
        CustomBaseUrl.get(`/reg-payments`),
        CustomBaseUrl.get(`/reg-diet-plans`),
        CustomBaseUrl.get(`/leads/stats`),
      ]);
      if(mR.status==='fulfilled') setMembers(mR.value.data?.data||[]);
      if(pR.status==='fulfilled') setPayments(pR.value.data?.payments||[]);
      if(dR.status==='fulfilled') setDietPlans(dR.value.data?.plans||[]);
      if(lR.status==='fulfilled') setLeadStats(lR.value.data?.stats||{total:0,new:0,converted:0,interested:0});
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  const activeM   = members.filter(m=>getMemberStatus(m.endDate)==='active');
  const expiringM = members.filter(m=>getMemberStatus(m.endDate)==='expiring');
  const expiredM  = members.filter(m=>getMemberStatus(m.endDate)==='expired');
  const balanceM  = payments.filter(p=>p.balanceAmount>0).reduce((acc,p)=>{
    if(!acc.find(x=>x._id===p.registrationId)){ const mb=members.find(m=>m._id===p.registrationId); if(mb) acc.push({...mb,balanceAmount:p.balanceAmount}); } return acc;
  },[]);

  const tMA=members.filter(m=>isThisMonth(m.startDate)&&getMemberStatus(m.endDate)==='active').length;
  const newThisMonth=members.filter(m=>isThisMonth(m.createdAt)).length;

  const autoReminders = [];
  const crit=members.filter(m=>{ const d=Math.ceil((new Date(m.endDate)-new Date())/86400000); return d>=0&&d<=3; });
  if(crit.length>0) autoReminders.push({ id:'exp3d', type:'urgent', text:`${crit.length} member${crit.length>1?'s':''} expiring in 3 days: ${crit.slice(0,2).map(m=>m.name).join(', ')}${crit.length>2?` +${crit.length-2} more`:''}`, auto:true, action:{label:'Collect Renewal',fn:()=>navigate('/payments/new')}});
  if(balanceM.length>0) autoReminders.push({ id:'bal', type:'payment', text:`${balanceM.length} member${balanceM.length>1?'s have':' has'} pending balance.`, auto:true, action:{label:'Collect Now',fn:()=>navigate('/payments/new')}});
  const dietIds=new Set(dietPlans.map(d=>String(d.registrationId)));
  const noDiet=activeM.filter(m=>!dietIds.has(String(m._id)));
  if(noDiet.length>0) autoReminders.push({ id:'nodiet', type:'diet', text:`${noDiet.length} active member${noDiet.length>1?'s':''} have no diet plan.`, auto:true, action:{label:'Create Diet',fn:()=>navigate('/diet-plans/new')}});

  const allReminders = [...autoReminders.filter(r=>!dismissed.includes(r.id)), ...manualNotes];

  const dismiss = (id) => { const u=[...dismissed,id]; setDismissed(u); localStorage.setItem('wfc_dismissed',JSON.stringify(u)); };
  const deleteManual = (id) => { const u=manualNotes.filter(n=>n.id!==id); setManualNotes(u); localStorage.setItem('wfc_manual_notes',JSON.stringify(u)); };
  const saveManual = (note) => { const u=[note,...manualNotes]; setManualNotes(u); localStorage.setItem('wfc_manual_notes',JSON.stringify(u)); };

  const CARDS = [
    { emoji:'👥', title:'Total',    value:members.length,   sub:`+${newThisMonth} new`,   gradient:'from-slate-700 to-slate-900',    list:members,   lc:{hBg:'bg-slate-800 text-white',hTxt:'text-white'} },
    { emoji:'💪', title:'Active',   value:activeM.length,   sub:`${tMA} this month`,      gradient:'from-emerald-500 to-green-700',  list:activeM,   lc:{hBg:'bg-emerald-600 text-white',hTxt:'text-white'} },
    { emoji:'⏳', title:'Expiring', value:expiringM.length, sub:'Within 7 days',          gradient:'from-amber-400 to-orange-500',   list:expiringM, lc:{hBg:'bg-amber-500 text-white',hTxt:'text-white'} },
    { emoji:'❌', title:'Expired',  value:expiredM.length,  sub:`This month`,             gradient:'from-red-500 to-rose-700',       list:expiredM,  lc:{hBg:'bg-red-600 text-white',hTxt:'text-white'} },
    { emoji:'💰', title:'Pending',  value:balanceM.length,  sub:balanceM.length>0?`₹${balanceM.reduce((s,m)=>s+m.balanceAmount,0).toLocaleString('en-IN')}`:'All clear', gradient:'from-violet-500 to-purple-700', list:balanceM, lc:{hBg:'bg-violet-600 text-white',hTxt:'text-white'} },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar/>
      <div className="max-w-7xl mx-auto px-4 py-5">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {new Date().getHours()<12?'Good Morning 🌅':new Date().getHours()<17?'Good Afternoon ☀️':'Good Evening 🌙'},&nbsp;
              <span className="text-red-600">{(()=>{try{const u=JSON.parse(localStorage.getItem('user')||'{}');return u.name||'Admin';}catch{return 'Admin';}})()}</span> 👋
            </h1>
            <p className="text-xs text-slate-400">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
          <button onClick={fetchAll} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-medium transition px-2.5 py-1.5 rounded-lg hover:bg-slate-200">
            <RefreshCw size={13} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2.5 mb-4">
          {loading ? [...Array(5)].map((_,i)=>(
            <div key={i} className="h-20 rounded-xl bg-white animate-pulse border border-slate-100"/>
          )) : CARDS.map(c=>(
            <button key={c.title} onClick={()=>setModal({title:c.title,members:c.list,color:c.lc})}
              className={`bg-gradient-to-br ${c.gradient} text-white rounded-xl p-3 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[.98] transition-all duration-200`}>
              <div className="flex items-start justify-between mb-1">
                <p className="text-2xl font-black leading-none">{c.value}</p>
                <span className="text-xl leading-none opacity-80">{c.emoji}</span>
              </div>
              <p className="text-[11px] font-semibold opacity-90">{c.title}</p>
              <p className="text-[10px] opacity-55 mt-0.5">{c.sub}</p>
            </button>
          ))}
        </div>

        {/* LINE CHART + REMINDERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Line Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            {chartReady && members.length > 0
              ? <LineChart members={members} />
              : <div className="h-48 flex items-center justify-center text-slate-300 text-sm">
                  {loading ? 'Loading chart…' : 'No member data yet'}
                </div>
            }
            {/* Summary stats row */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-50">
              {[
                {label:'New Joined',  val:newThisMonth,    c:'text-blue-600',    bg:'bg-blue-50',    emoji:'🆕'},
                {label:'Active Now',  val:activeM.length,  c:'text-emerald-600', bg:'bg-emerald-50', emoji:'✅'},
                {label:'Expiring',    val:expiringM.length,c:'text-amber-600',   bg:'bg-amber-50',   emoji:'⏳'},
                {label:'Expired',     val:expiredM.length, c:'text-red-500',     bg:'bg-red-50',     emoji:'❌'},
              ].map(({label,val,c,bg,emoji})=>(
                <div key={label} className={`text-center rounded-xl py-2 px-1 ${bg}`}>
                  <p className="text-base mb-0.5">{emoji}</p>
                  <p className={`text-lg font-black leading-none ${c}`}>{val}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Bell size={13} className="text-slate-500"/>
                <p className="font-bold text-slate-900 text-xs">Reminders</p>
                {allReminders.length>0&&<span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">{allReminders.length}</span>}
              </div>
              <button onClick={()=>setShowAddReminder(true)} className="flex items-center gap-1 bg-slate-800 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold hover:bg-slate-700 transition">
                <Plus size={11}/> Add
              </button>
            </div>
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-52">
              {allReminders.length===0 ? (
                <div className="text-center py-6 text-slate-400"><CheckCircle size={22} className="mx-auto mb-1.5 text-emerald-400"/><p className="text-[11px]">All clear! No reminders.</p></div>
              ) : allReminders.map(r => {
                const rc = RC[r.type] || RC.auto;
                const RIcon = TYPE_ICON[r.type] || Bell;
                return (
                  <div key={r.id} className={`flex items-start gap-2 p-2.5 rounded-xl border ${rc.bg} ${rc.border} group`}>
                    <RIcon size={13} className={`${rc.icon} flex-shrink-0 mt-0.5`}/>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-semibold leading-snug ${rc.title}`}>{r.text}</p>
                      {r.action&&<button onClick={r.action.fn} className={`text-[10px] font-bold underline underline-offset-1 mt-1 ${rc.title}`}>{r.action.label} →</button>}
                      {!r.auto&&<p className="text-[9px] text-slate-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>}
                    </div>
                    <button onClick={()=>r.auto?dismiss(r.id):deleteManual(r.id)} className="opacity-0 group-hover:opacity-100 transition p-0.5 rounded hover:bg-black/10">
                      <X size={11} className="text-slate-400"/>
                    </button>
                  </div>
                );
              })}
            </div>
            {dismissed.length>0&&<button onClick={()=>{setDismissed([]);localStorage.removeItem('wfc_dismissed');}} className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 transition text-center">Restore dismissed</button>}
          </div>
        </div>

        {/* Leads strip */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-4 mb-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition"
          onClick={() => navigate('/leads')}>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0"><Megaphone size={20} /></div>
          <div className="flex-1">
            <p className="font-bold text-sm">Leads & Enquiries</p>
            <p className="text-xs opacity-70">Track gym enquiries and convert to members</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {[
              {label:'Total',    val:leadStats.total,     c:'text-white'},
              {label:'New',      val:leadStats.new||0,    c:'text-blue-200'},
              {label:'Hot 🔥',   val:(leadStats.interested||0), c:'text-yellow-300'},
              {label:'Converted',val:leadStats.converted||0,c:'text-emerald-300'},
            ].map(({label,val,c})=>(
              <div key={label} className="text-center">
                <p className={`text-xl font-black leading-none ${c}`}>{val}</p>
                <p className="text-[9px] opacity-60 whitespace-nowrap">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add Member',  icon: Plus,       color: 'bg-slate-800 hover:bg-slate-700',    fn: () => navigate('/register') },
              { label: 'New Payment', icon: CreditCard,  color: 'bg-red-600 hover:bg-red-700',        fn: () => navigate('/payments/new') },
              { label: 'Diet Plan',   icon: Salad,       color: 'bg-green-600 hover:bg-green-700',    fn: () => navigate('/diet-plans/new') },
              { label: 'All Members', icon: Users,       color: 'bg-violet-600 hover:bg-violet-700',  fn: () => navigate('/members') },
            ].map((action) => (
              <button key={action.label} onClick={action.fn}
                className={`flex items-center gap-2.5 px-4 py-3 ${action.color} text-white rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm`}>
                {React.createElement(action.icon, { size: 16 })}{action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modal&&<MemberModal title={modal.title} members={modal.members} color={modal.color} onClose={()=>setModal(null)}/>}
      {showAddReminder&&<AddReminderModal onSave={saveManual} onClose={()=>setShowAddReminder(false)}/>}
    </div>
  );
};

const Dashboard = () => {
  const userObj = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  if (userObj.role === 'member') return <MemberDashboard user={userObj} />;
  return <AdminDashboard />;
};

export default Dashboard;
