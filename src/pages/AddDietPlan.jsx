import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import {
  ArrowLeft, Search, X, Plus, Minus, Flame, Droplets,
  Target, Check, ChevronDown, Apple, Leaf, Zap, Activity
} from 'lucide-react';

const BASE_URL = 'https://wfc-backend-server.onrender.com';

const GOALS = ['Weight Loss', 'Muscle Gain', 'Maintenance', 'Endurance', 'Custom'];

const MEAL_CONFIG = [
  { key: 'breakfast',    emoji: '🌅', label: 'Breakfast',       defaultTime: '08:00', color: 'amber' },
  { key: 'morningSnack', emoji: '🍎', label: 'Morning Snack',   defaultTime: '10:30', color: 'green' },
  { key: 'lunch',        emoji: '☀️', label: 'Lunch',           defaultTime: '13:00', color: 'orange' },
  { key: 'eveningSnack', emoji: '🍵', label: 'Evening Snack',   defaultTime: '16:30', color: 'teal' },
  { key: 'dinner',       emoji: '🌙', label: 'Dinner',          defaultTime: '20:00', color: 'indigo' },
];

const MEAL_COLOR = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  heading: 'text-amber-700',  badge: 'bg-amber-100' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  heading: 'text-green-700',  badge: 'bg-green-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', heading: 'text-orange-700', badge: 'bg-orange-100' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   heading: 'text-teal-700',   badge: 'bg-teal-100' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', heading: 'text-indigo-700', badge: 'bg-indigo-100' },
};

// Food item tag input component
const FoodTagInput = ({ items, onChange, placeholder, color }) => {
  const [input, setInput] = useState('');
  const mc = MEAL_COLOR[color] || MEAL_COLOR.amber;

  const addItem = (val) => {
    const trimmed = val.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInput('');
  };

  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${mc.badge} ${mc.heading}`}>
            {item}
            <button onClick={() => removeItem(i)} className="hover:opacity-60 transition"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addItem(input); }}}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        />
        <button onClick={() => addItem(input)}
          className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition">
          Add
        </button>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">Press Enter or comma to add items</p>
    </div>
  );
};

// Number stepper
const Stepper = ({ label, value, onChange, unit, step = 1, min = 0 }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-slate-500">{label}</label>
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
        <Minus size={12} />
      </button>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Math.max(min, parseFloat(e.target.value) || 0))}
        className="w-20 text-center py-1.5 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <button onClick={() => onChange(value + step)}
        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
        <Plus size={12} />
      </button>
      <span className="text-xs text-slate-400">{unit}</span>
    </div>
  </div>
);

const emptyMeal = (time) => ({ items: [], calories: 0, time, notes: '' });

const defaultForm = () => ({
  goal: 'Maintenance',
  calorieTarget: 2000,
  weightGoal: '',
  waterIntake: 3,
  breakfast:    emptyMeal('08:00'),
  morningSnack: emptyMeal('10:30'),
  lunch:        emptyMeal('13:00'),
  eveningSnack: emptyMeal('16:30'),
  dinner:       emptyMeal('20:00'),
  protein: 150,
  carbs:   200,
  fats:    60,
  fiber:   25,
  supplements: [],
  notes: '',
});

const AddDietPlan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editPlan = location.state?.editPlan;

  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [suppInput, setSuppInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // meal tab index

  useEffect(() => {
    fetchMembers();
    if (editPlan) {
      setForm({
        goal:         editPlan.goal || 'Maintenance',
        calorieTarget: editPlan.calorieTarget || 2000,
        weightGoal:   editPlan.weightGoal || '',
        waterIntake:  editPlan.waterIntake || 3,
        breakfast:    editPlan.breakfast    || emptyMeal('08:00'),
        morningSnack: editPlan.morningSnack || emptyMeal('10:30'),
        lunch:        editPlan.lunch        || emptyMeal('13:00'),
        eveningSnack: editPlan.eveningSnack || emptyMeal('16:30'),
        dinner:       editPlan.dinner       || emptyMeal('20:00'),
        protein:      editPlan.protein  || 150,
        carbs:        editPlan.carbs    || 200,
        fats:         editPlan.fats     || 60,
        fiber:        editPlan.fiber    || 25,
        supplements:  editPlan.supplements || [],
        notes:        editPlan.notes || '',
      });
      setSearch(editPlan.memberName || '');
      setSelectedMember({ _id: editPlan.registrationId, name: editPlan.memberName, phone: editPlan.memberPhone });
    }
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`https://wfc-backend-server.onrender.com/api/v1/fetch`);
      setMembers(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) || m.phone?.includes(search)
  ).slice(0, 7);

  const updateMeal = (mealKey, field, val) => {
    setForm(f => ({ ...f, [mealKey]: { ...f[mealKey], [field]: val } }));
  };

  const totalCalories = MEAL_CONFIG.reduce((s, m) => s + (form[m.key]?.calories || 0), 0);

  const handleSubmit = async () => {
    if (!selectedMember) return alert('Please select a member');
    setLoading(true);
    try {
      const payload = { registrationId: selectedMember._id, ...form };

      if (editPlan) {
        await axios.put(`https://wfc-backend-server.onrender.com/api/v1/reg-diet-plans/${editPlan._id}`, payload);
      } else {
        await axios.post(`https://wfc-backend-server.onrender.com/api/v1/reg-diet-plans`, payload);
      }
      navigate('/diet-plans');
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const addSupplement = (val) => {
    const t = val.trim();
    if (t && !form.supplements.includes(t)) setForm(f => ({ ...f, supplements: [...f.supplements, t] }));
    setSuppInput('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <button onClick={() => navigate('/diet-plans')} className="p-2 rounded-xl hover:bg-slate-200 transition">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{editPlan ? 'Edit Diet Plan' : 'New Diet Plan'}</h1>
            <p className="text-slate-500 text-sm">Design a personalised nutrition plan</p>
          </div>
        </div>

        {/* ── 1. Member ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">1 · Member</p>
          <div className="relative">
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-green-400 bg-slate-50">
              <Search size={14} className="text-slate-400" />
              <input value={search}
                onChange={e => { setSearch(e.target.value); setShowDrop(true); setSelectedMember(null); }}
                onFocus={() => setShowDrop(true)}
                placeholder="Search member by name or phone…"
                className="flex-1 bg-transparent text-sm outline-none text-slate-800 placeholder-slate-400" />
              {search && <button onClick={() => { setSearch(''); setSelectedMember(null); }}><X size={13} className="text-slate-400" /></button>}
            </div>
            {showDrop && search && filteredMembers.length > 0 && !selectedMember && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                {filteredMembers.map(m => (
                  <button key={m._id} onClick={() => { setSelectedMember(m); setSearch(m.name); setShowDrop(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">{m.name?.[0]?.toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.phone} · {m.age} yrs · {m.gender}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedMember && (
            <div className="mt-3 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">{selectedMember.name?.[0]?.toUpperCase()}</div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{selectedMember.name}</p>
                <p className="text-xs text-slate-500">{selectedMember.phone}</p>
              </div>
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Selected</span>
            </div>
          )}
        </section>

        {/* ── 2. Goal & Targets ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">2 · Goal & Targets</p>

          {/* Goal selector */}
          <div className="grid grid-cols-5 gap-2 mb-5">
            {GOALS.map(g => (
              <button key={g} onClick={() => setForm(f => ({ ...f, goal: g }))}
                className={`py-2 px-1 rounded-xl border-2 text-xs font-bold text-center transition-all ${
                  form.goal === g ? 'border-green-500 bg-green-50 text-green-700 shadow-sm scale-[1.03]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}>
                {g === 'Weight Loss' ? '⬇️' : g === 'Muscle Gain' ? '💪' : g === 'Maintenance' ? '⚖️' : g === 'Endurance' ? '🏃' : '✏️'}
                <br />{g.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Stepper label="🔥 Calorie Target" value={form.calorieTarget} onChange={v => setForm(f => ({ ...f, calorieTarget: v }))} unit="kcal" step={50} />
            <Stepper label="💧 Water Intake"   value={form.waterIntake}   onChange={v => setForm(f => ({ ...f, waterIntake: v }))}   unit="litres" step={0.5} />
            <Stepper label="🎯 Weight Goal"    value={form.weightGoal || 0} onChange={v => setForm(f => ({ ...f, weightGoal: v }))} unit="kg" />
          </div>
        </section>

        {/* ── 3. Meals ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">3 · Meal Plan</p>
            {totalCalories > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                <Flame size={12} /> {totalCalories} kcal total
              </span>
            )}
          </div>

          {/* Meal tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {MEAL_CONFIG.map((mc, i) => (
              <button key={mc.key} onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  activeTab === i ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {mc.emoji} {mc.label}
                {form[mc.key]?.items?.length > 0 && (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${activeTab === i ? 'bg-white text-slate-800' : 'bg-green-500 text-white'}`}>
                    {form[mc.key].items.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active meal editor */}
          {MEAL_CONFIG.map((mc, i) => {
            if (activeTab !== i) return null;
            const clr = MEAL_COLOR[mc.color];
            const meal = form[mc.key];
            return (
              <div key={mc.key} className={`rounded-2xl border p-4 ${clr.bg} ${clr.border}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold text-sm ${clr.heading}`}>{mc.emoji} {mc.label}</h3>
                  <input type="time" value={meal.time}
                    onChange={e => updateMeal(mc.key, 'time', e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-green-400" />
                </div>

                {/* Food items */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Food Items</label>
                  <FoodTagInput items={meal.items || []} onChange={v => updateMeal(mc.key, 'items', v)}
                    placeholder={`e.g. ${mc.key === 'breakfast' ? 'Oats, Eggs, Milk' : mc.key === 'lunch' ? 'Rice, Dal, Sabzi' : 'Fruits, Nuts'}`}
                    color={mc.color} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Calories</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={meal.calories}
                        onChange={e => updateMeal(mc.key, 'calories', parseInt(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                      <span className="text-xs text-slate-400">kcal</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
                    <input value={meal.notes || ''}
                      onChange={e => updateMeal(mc.key, 'notes', e.target.value)}
                      placeholder="Optional note…"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── 4. Macros ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">4 · Macronutrients (per day)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'protein', label: '💪 Protein', color: 'blue',  icon: '🥩' },
              { key: 'carbs',   label: '⚡ Carbs',   color: 'amber', icon: '🌾' },
              { key: 'fats',    label: '🫒 Fats',    color: 'red',   icon: '🥑' },
              { key: 'fiber',   label: '🌿 Fiber',   color: 'green', icon: '🥦' },
            ].map(({ key, label }) => (
              <Stepper key={key} label={label} value={form[key]} onChange={v => setForm(f => ({ ...f, [key]: v }))} unit="g" step={5} />
            ))}
          </div>

          {/* Macro visual bar */}
          {(form.protein + form.carbs + form.fats) > 0 && (
            <div className="mt-4">
              <div className="flex rounded-full overflow-hidden h-3">
                {[
                  { val: form.protein, color: 'bg-blue-500' },
                  { val: form.carbs,   color: 'bg-amber-500' },
                  { val: form.fats,    color: 'bg-red-500' },
                  { val: form.fiber,   color: 'bg-green-500' },
                ].map(({ val, color }, i) => {
                  const total = form.protein + form.carbs + form.fats + form.fiber;
                  return <div key={i} className={`${color} transition-all`} style={{ width: `${(val / total) * 100}%` }} />;
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span className="text-blue-500">Protein {Math.round(form.protein / (form.protein + form.carbs + form.fats + form.fiber) * 100)}%</span>
                <span className="text-amber-500">Carbs {Math.round(form.carbs / (form.protein + form.carbs + form.fats + form.fiber) * 100)}%</span>
                <span className="text-red-500">Fats {Math.round(form.fats / (form.protein + form.carbs + form.fats + form.fiber) * 100)}%</span>
                <span className="text-green-500">Fiber {Math.round(form.fiber / (form.protein + form.carbs + form.fats + form.fiber) * 100)}%</span>
              </div>
            </div>
          )}
        </section>

        {/* ── 5. Supplements & Notes ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">5 · Supplements & Notes</p>

          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Supplements</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.supplements.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                  {s} <button onClick={() => setForm(f => ({ ...f, supplements: f.supplements.filter((_, j) => j !== i) }))}><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={suppInput} onChange={e => setSuppInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSupplement(suppInput); }}}
                placeholder="e.g. Whey Protein, Creatine, Multivitamin…"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400" />
              <button onClick={() => addSupplement(suppInput)}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-700 transition">Add</button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Additional Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} placeholder="Any special instructions, allergies, preferences…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
          </div>
        </section>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading || !selectedMember}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-700 active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2">
          {loading ? (
            <><span className="animate-spin">⏳</span> Saving…</>
          ) : (
            <><Check size={20} /> {editPlan ? 'Update Diet Plan' : 'Save Diet Plan'}</>
          )}
        </button>
      </div>
    </div>
  );
};

export default AddDietPlan;
