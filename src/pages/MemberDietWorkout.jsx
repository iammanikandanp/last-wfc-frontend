// src/pages/MemberDietWorkout.jsx
// Drop-in section used inside MemberProfile — handles Diet & Workout CSV import,
// display, and editing for a given member.
//
// Usage:
//   import MemberDietWorkout from './MemberDietWorkout';
//   <MemberDietWorkout memberId={member._id} memberName={member.name} />

import React, { useState, useEffect, useRef } from "react";
import CustomBaseUrl from "../hooks/CustomBaseUrl";
import {
  Apple, Dumbbell, Upload, RefreshCw, Edit3, Save, X,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  Flame, Droplets, Sun, Moon, Zap, Clock, Repeat,
  FileText, Download, Plus, Trash2, Check,
} from "lucide-react";

const BASE_URL = "https://wfc-backend-server.onrender.com/api/v1";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_COLORS = {
  Monday:    { bg: "bg-red-50",     border: "border-red-200",    dot: "bg-red-500",    text: "text-red-700"    },
  Tuesday:   { bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-500",   text: "text-blue-700"   },
  Wednesday: { bg: "bg-violet-50",  border: "border-violet-200", dot: "bg-violet-500", text: "text-violet-700" },
  Thursday:  { bg: "bg-amber-50",   border: "border-amber-200",  dot: "bg-amber-500",  text: "text-amber-700"  },
  Friday:    { bg: "bg-emerald-50", border: "border-emerald-200",dot: "bg-emerald-500",text: "text-emerald-700"},
  Saturday:  { bg: "bg-pink-50",    border: "border-pink-200",   dot: "bg-pink-500",   text: "text-pink-700"   },
};

/* ── Reusable CSV Upload Zone ──────────────────────────────────────────────── */
const CSVUploadZone = ({ onFile, accept = ".csv", label, description, color = "blue" }) => {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState("");

  const colorMap = {
    green: { ring: "ring-green-400", bg: "bg-green-50", border: "border-green-300", text: "text-green-700", btn: "bg-green-600 hover:bg-green-700" },
    red:   { ring: "ring-red-400",   bg: "bg-red-50",   border: "border-red-300",   text: "text-red-700",   btn: "bg-red-600 hover:bg-red-700"     },
  };
  const c = colorMap[color] || colorMap.green;

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    onFile(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => ref.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all
        ${drag ? `${c.bg} ${c.border} ring-2 ${c.ring}` : "border-slate-200 hover:border-slate-300 bg-slate-50/50"}`}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => handleFile(e.target.files[0])} />
      <Upload size={22} className={`mx-auto mb-2 ${fileName ? c.text : "text-slate-300"}`} />
      {fileName
        ? <p className={`text-sm font-semibold ${c.text}`}>{fileName}</p>
        : <>
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          </>
      }
    </div>
  );
};

/* ── Toast notification ────────────────────────────────────────────────────── */
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-5 right-5 z-[999] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold
      ${type === "success" ? "bg-emerald-600" : type === "error" ? "bg-red-600" : "bg-slate-700"}`}
      style={{ animation: "slideIn .3s ease" }}>
      {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><X size={14} /></button>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   DIET SECTION
══════════════════════════════════════════════════════════════════════════════ */
const DietSection = ({ memberId, memberName }) => {
  const [diet,        setDiet]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [file,        setFile]        = useState(null);
  const [planName,    setPlanName]    = useState("Diet Plan");
  const [editingDay,  setEditingDay]  = useState(null); // { dietId, dayId, data }
  const [expandedDay, setExpandedDay] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [showUpload,  setShowUpload]  = useState(false);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => { fetchDiet(); }, [memberId]);

  const fetchDiet = async () => {
    setLoading(true);
    try {
      const res = await CustomBaseUrl.get(`member-diet/member/${memberId}`);
      setDiet(res.data.diet);
    } catch {
      setDiet(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return showToast("Please select a CSV file", "error");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("registrationId", memberId);
      fd.append("planName", planName);
      const res = await CustomBaseUrl.post(`member-diet/import`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDiet(res.data.diet);
      setFile(null);
      setShowUpload(false);
      showToast(`✅ ${res.data.message}`);
      if (res.data.warnings?.length) showToast(`⚠️ ${res.data.warnings[0]}`, "warning");
    } catch (e) {
      showToast(e.response?.data?.message || "Import failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const startEditDay = (day) => {
    setEditingDay({ dietId: diet._id, dayId: day._id, data: { ...day } });
  };

  const saveEditDay = async () => {
    if (!editingDay) return;
    try {
      const res = await CustomBaseUrl.put(
        `member-diet/${editingDay.dietId}/day/${editingDay.dayId}`,
        editingDay.data
      );
      setDiet(res.data.diet);
      setEditingDay(null);
      showToast("Day updated successfully");
    } catch (e) {
      showToast(e.response?.data?.message || "Update failed", "error");
    }
  };

  const deleteDiet = async () => {
    if (!window.confirm("Remove this diet plan?")) return;
    try {
      await CustomBaseUrl.delete(`member-diet/${diet._id}`);
      setDiet(null);
      showToast("Diet plan removed");
    } catch {
      showToast("Delete failed", "error");
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
            <Apple size={15} className="text-green-600" />
          </div>
          <span className="font-bold text-slate-800">Diet Plan</span>
          {diet && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{diet.planName}</span>}
        </div>
        <div className="flex items-center gap-2">
          {diet && <button onClick={deleteDiet} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>}
          <button onClick={() => setShowUpload(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${showUpload ? "bg-slate-200 text-slate-700" : "bg-green-600 text-white hover:bg-green-700"}`}>
            {showUpload ? <><X size={12} /> Cancel</> : <><Upload size={12} /> Import CSV</>}
          </button>
        </div>
      </div>

      {/* ── Upload Zone ── */}
      {showUpload && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Upload Diet CSV</p>
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">Plan Name</label>
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              placeholder="e.g. Weight Loss Plan"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <CSVUploadZone
            onFile={setFile}
            label="Drop diet CSV or click to browse"
            description="Headers: day, morning, afternoon, evening, night, preWorkout, postWorkout, food, calories, weightLoss, weightGain"
            color="green"
          />
          {file && (
            <button onClick={handleImport} disabled={uploading}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition">
              {uploading ? <><RefreshCw size={14} className="animate-spin" /> Importing…</> : <><Check size={14} /> Import Diet Plan</>}
            </button>
          )}

          {/* CSV hint */}
          <details className="mt-3">
            <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">📋 View expected CSV format</summary>
            <div className="mt-2 bg-slate-50 rounded-xl p-3 overflow-x-auto">
              <code className="text-[10px] text-slate-600 whitespace-pre">{`day,morning,afternoon,evening,night,preWorkout,postWorkout,food,calories,weightLoss,weightGain
Monday,"Oats + eggs","Brown rice + chicken","Almonds + tea","Paneer + roti","Banana","Whey shake","Oats,Eggs,Chicken",1850,yes,no
Tuesday,"Poha + milk","Dal + roti","Apple","Grilled fish","Dates","Protein shake","Poha,Dal,Fish",1800,yes,no`}</code>
            </div>
          </details>
        </div>
      )}

      {/* ── Diet Days Display ── */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : !diet ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <Apple size={32} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-400 font-medium">No diet plan imported yet</p>
          <p className="text-xs text-slate-300 mt-1">Upload a CSV file above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {DAYS.map(day => {
            const entry = diet.days.find(d => d.day === day);
            if (!entry) return null;
            const c = DAY_COLORS[day] || DAY_COLORS.Monday;
            const isExpanded = expandedDay === day;
            const isEditing  = editingDay?.dayId === entry._id;

            return (
              <div key={day} className={`rounded-2xl border transition-all ${c.bg} ${c.border}`}>
                {/* Day header */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedDay(isExpanded ? null : day)}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className={`font-bold text-sm ${c.text} flex-1`}>{day}</span>
                  {entry.calories > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      <Flame size={9} />{entry.calories} kcal
                    </span>
                  )}
                  {entry.weightLoss === "yes" && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">↓ Loss</span>}
                  {entry.weightGain === "yes" && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">↑ Gain</span>}
                  <button onClick={e => { e.stopPropagation(); startEditDay(entry); }}
                    className="p-1 rounded-lg hover:bg-white/60 transition"><Edit3 size={12} className="text-slate-400" /></button>
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>

                {/* Expanded content */}
                {isExpanded && !isEditing && (
                  <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { icon: "🌅", label: "Morning",      val: entry.morning     },
                      { icon: "☀️", label: "Afternoon",    val: entry.afternoon   },
                      { icon: "🌆", label: "Evening",      val: entry.evening     },
                      { icon: "🌙", label: "Night",        val: entry.night       },
                      { icon: "⚡", label: "Pre-Workout",  val: entry.preWorkout  },
                      { icon: "💪", label: "Post-Workout", val: entry.postWorkout },
                    ].filter(f => f.val).map(({ icon, label, val }) => (
                      <div key={label} className="bg-white/70 rounded-xl p-2.5">
                        <p className="text-[9px] font-bold text-slate-400 mb-1">{icon} {label}</p>
                        <p className="text-xs text-slate-700 leading-snug">{val}</p>
                      </div>
                    ))}
                    {entry.food && (
                      <div className="col-span-2 md:col-span-3 bg-white/70 rounded-xl p-2.5">
                        <p className="text-[9px] font-bold text-slate-400 mb-1.5">🥗 Foods</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.food.split(",").map((f, i) => (
                            <span key={i} className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{f.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit mode */}
                {isEditing && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {["morning","afternoon","evening","night","preWorkout","postWorkout","food"].map(field => (
                        <div key={field} className={field === "food" ? "col-span-2" : ""}>
                          <label className="text-[10px] font-bold text-slate-500 capitalize mb-1 block">
                            {field.replace(/([A-Z])/g, " $1")}
                          </label>
                          <input
                            value={editingDay.data[field] || ""}
                            onChange={e => setEditingDay(prev => ({ ...prev, data: { ...prev.data, [field]: e.target.value } }))}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">Calories</label>
                        <input type="number"
                          value={editingDay.data.calories || ""}
                          onChange={e => setEditingDay(prev => ({ ...prev, data: { ...prev.data, calories: parseInt(e.target.value) || 0 } }))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        {["weightLoss","weightGain"].map(field => (
                          <label key={field} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox"
                              checked={editingDay.data[field] === "yes"}
                              onChange={e => setEditingDay(prev => ({ ...prev, data: { ...prev.data, [field]: e.target.checked ? "yes" : "no" } }))}
                              className="rounded" />
                            <span className="text-[10px] text-slate-600 capitalize">{field.replace(/([A-Z])/g," $1")}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingDay(null)}
                        className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition">Cancel</button>
                      <button onClick={saveEditDay}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition">
                        <Save size={12} /> Save Day
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   WORKOUT SECTION
══════════════════════════════════════════════════════════════════════════════ */
const WorkoutSection = ({ memberId, memberName }) => {
  const [workout,     setWorkout]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [file,        setFile]        = useState(null);
  const [planName,    setPlanName]    = useState("Workout Plan");
  const [editingDay,  setEditingDay]  = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [showUpload,  setShowUpload]  = useState(false);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => { fetchWorkout(); }, [memberId]);

  const fetchWorkout = async () => {
    setLoading(true);
    try {
      const res = await CustomBaseUrl.get(`member-workout/member/${memberId}`);
      setWorkout(res.data.workout);
    } catch {
      setWorkout(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return showToast("Please select a CSV file", "error");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("registrationId", memberId);
      fd.append("planName", planName);
      const res = await CustomBaseUrl.post(`member-workout/import`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setWorkout(res.data.workout);
      setFile(null);
      setShowUpload(false);
      showToast(`✅ ${res.data.message}`);
    } catch (e) {
      showToast(e.response?.data?.message || "Import failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const startEditDay = (day) => {
    setEditingDay({ workoutId: workout._id, dayId: day._id, data: { ...day } });
  };

  const saveEditDay = async () => {
    if (!editingDay) return;
    try {
      const res = await CustomBaseUrl.put(
        `member-workout/${editingDay.workoutId}/day/${editingDay.dayId}`,
        editingDay.data
      );
      setWorkout(res.data.workout);
      setEditingDay(null);
      showToast("Day updated successfully");
    } catch (e) {
      showToast(e.response?.data?.message || "Update failed", "error");
    }
  };

  const deleteWorkout = async () => {
    if (!window.confirm("Remove this workout plan?")) return;
    try {
      await CustomBaseUrl.delete(`member-workout/${workout._id}`);
      setWorkout(null);
      showToast("Workout plan removed");
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const MUSCLE_GROUPS = [
    { key: "chest",     icon: "🏋️", label: "Chest"     },
    { key: "back",      icon: "🔙", label: "Back"      },
    { key: "biceps",    icon: "💪", label: "Biceps"    },
    { key: "triceps",   icon: "🦾", label: "Triceps"   },
    { key: "legs",      icon: "🦵", label: "Legs"      },
    { key: "shoulders", icon: "🏔️", label: "Shoulders" },
    { key: "cardio",    icon: "🏃", label: "Cardio"    },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
            <Dumbbell size={15} className="text-red-600" />
          </div>
          <span className="font-bold text-slate-800">Workout Plan</span>
          {workout && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{workout.planName}</span>}
        </div>
        <div className="flex items-center gap-2">
          {workout && <button onClick={deleteWorkout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>}
          <button onClick={() => setShowUpload(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${showUpload ? "bg-slate-200 text-slate-700" : "bg-red-600 text-white hover:bg-red-700"}`}>
            {showUpload ? <><X size={12} /> Cancel</> : <><Upload size={12} /> Import CSV</>}
          </button>
        </div>
      </div>

      {/* ── Upload Zone ── */}
      {showUpload && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Upload Workout CSV</p>
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">Plan Name</label>
            <input value={planName} onChange={e => setPlanName(e.target.value)}
              placeholder="e.g. Strength Training Plan"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <CSVUploadZone
            onFile={setFile}
            label="Drop workout CSV or click to browse"
            description="Headers: day, morning, evening, chest, back, biceps, triceps, legs, shoulders, cardio, count, reps"
            color="red"
          />
          {file && (
            <button onClick={handleImport} disabled={uploading}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition">
              {uploading ? <><RefreshCw size={14} className="animate-spin" /> Importing…</> : <><Check size={14} /> Import Workout Plan</>}
            </button>
          )}

          <details className="mt-3">
            <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">📋 View expected CSV format</summary>
            <div className="mt-2 bg-slate-50 rounded-xl p-3 overflow-x-auto">
              <code className="text-[10px] text-slate-600 whitespace-pre">{`day,morning,evening,chest,back,biceps,triceps,legs,shoulders,cardio,count,reps
Monday,"Run 20 min","Chest & Triceps","Bench Press,Flyes,Push-ups","","","Dips,Pushdown","","","Treadmill 15",4,12
Tuesday,"Yoga","Back & Biceps","","Pull-ups,Rows","Barbell Curl","","","","Cycling 15",4,10`}</code>
            </div>
          </details>
        </div>
      )}

      {/* ── Workout Days Display ── */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : !workout ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <Dumbbell size={32} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-400 font-medium">No workout plan imported yet</p>
          <p className="text-xs text-slate-300 mt-1">Upload a CSV file above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {DAYS.map(day => {
            const entry = workout.days.find(d => d.day === day);
            if (!entry) return null;
            const c = DAY_COLORS[day] || DAY_COLORS.Monday;
            const isExpanded = expandedDay === day;
            const isEditing  = editingDay?.dayId === entry._id;

            const activeMuscles = MUSCLE_GROUPS.filter(mg => entry[mg.key]?.trim());

            return (
              <div key={day} className={`rounded-2xl border transition-all ${c.bg} ${c.border}`}>
                {/* Day header */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedDay(isExpanded ? null : day)}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className={`font-bold text-sm ${c.text} flex-1`}>{day}</span>
                  {/* Muscle group chips */}
                  <div className="flex flex-wrap gap-1 mr-1">
                    {activeMuscles.slice(0, 4).map(mg => (
                      <span key={mg.key} className="text-[9px] bg-white/70 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">{mg.icon}</span>
                    ))}
                    {activeMuscles.length > 4 && <span className="text-[9px] text-slate-400">+{activeMuscles.length - 4}</span>}
                  </div>
                  {(entry.count > 0 || entry.reps > 0) && (
                    <span className="text-[10px] bg-white/70 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Repeat size={8} />{entry.count}×{entry.reps}
                    </span>
                  )}
                  <button onClick={e => { e.stopPropagation(); startEditDay(entry); }}
                    className="p-1 rounded-lg hover:bg-white/60 transition"><Edit3 size={12} className="text-slate-400" /></button>
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>

                {/* Expanded */}
                {isExpanded && !isEditing && (
                  <div className="px-4 pb-4">
                    {/* Morning / Evening sessions */}
                    {(entry.morning || entry.evening) && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {entry.morning && (
                          <div className="bg-white/70 rounded-xl p-2.5">
                            <p className="text-[9px] font-bold text-slate-400 mb-1">🌅 Morning</p>
                            <p className="text-xs text-slate-700">{entry.morning}</p>
                          </div>
                        )}
                        {entry.evening && (
                          <div className="bg-white/70 rounded-xl p-2.5">
                            <p className="text-[9px] font-bold text-slate-400 mb-1">🌆 Evening</p>
                            <p className="text-xs text-slate-700">{entry.evening}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Muscle groups */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {MUSCLE_GROUPS.map(mg => {
                        if (!entry[mg.key]?.trim()) return null;
                        return (
                          <div key={mg.key} className="bg-white/70 rounded-xl p-2.5">
                            <p className="text-[9px] font-bold text-slate-400 mb-1.5">{mg.icon} {mg.label}</p>
                            <div className="flex flex-wrap gap-1">
                              {entry[mg.key].split(",").map((ex, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{ex.trim()}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Sets × Reps */}
                    {(entry.count > 0 || entry.reps > 0) && (
                      <div className="mt-2 flex gap-2">
                        <span className="text-xs bg-slate-800 text-white px-3 py-1 rounded-full font-bold">{entry.count} Sets</span>
                        <span className="text-xs bg-slate-600 text-white px-3 py-1 rounded-full font-bold">{entry.reps} Reps</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit mode */}
                {isEditing && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {["morning","evening"].map(field => (
                        <div key={field}>
                          <label className="text-[10px] font-bold text-slate-500 capitalize mb-1 block">{field}</label>
                          <input value={editingDay.data[field] || ""}
                            onChange={e => setEditingDay(prev => ({ ...prev, data: { ...prev.data, [field]: e.target.value } }))}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white" />
                        </div>
                      ))}
                      {MUSCLE_GROUPS.map(mg => (
                        <div key={mg.key} className={mg.key === "cardio" ? "col-span-2" : ""}>
                          <label className="text-[10px] font-bold text-slate-500 mb-1 block">{mg.icon} {mg.label}</label>
                          <input value={editingDay.data[mg.key] || ""}
                            onChange={e => setEditingDay(prev => ({ ...prev, data: { ...prev.data, [mg.key]: e.target.value } }))}
                            placeholder="comma-separated exercises"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white" />
                        </div>
                      ))}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">Sets (count)</label>
                        <input type="number" value={editingDay.data.count || ""}
                          onChange={e => setEditingDay(prev => ({ ...prev, data: { ...prev.data, count: parseInt(e.target.value) || 0 } }))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">Reps</label>
                        <input type="number" value={editingDay.data.reps || ""}
                          onChange={e => setEditingDay(prev => ({ ...prev, data: { ...prev.data, reps: parseInt(e.target.value) || 0 } }))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingDay(null)}
                        className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition">Cancel</button>
                      <button onClick={saveEditDay}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition">
                        <Save size={12} /> Save Day
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT — use inside MemberProfile middle column
══════════════════════════════════════════════════════════════════════════════ */
const MemberDietWorkout = ({ memberId, memberName }) => {
  if (!memberId) return null;

  return (
    <div className="space-y-6">
      {/* Diet */}
      <DietSection    memberId={memberId} memberName={memberName} />
      {/* Divider */}
      <div className="border-t border-slate-100" />
      {/* Workout */}
      <WorkoutSection memberId={memberId} memberName={memberName} />
    </div>
  );
};

export default MemberDietWorkout;
