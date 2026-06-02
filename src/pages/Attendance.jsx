import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import {
  Upload, Search, X, Download, Users, Clock,
  CheckCircle, XCircle, Link, AlertCircle,
  Dumbbell, Sun, Moon, Star, UserCheck, RefreshCw,
  ChevronLeft, ChevronRight, Trash2, FileText, ExternalLink
} from 'lucide-react';

const PER_PAGE = 10;

const DEPT = {
  GYM:       { label:'GYM',     color:'bg-red-600',    light:'bg-red-50 text-red-700 border-red-200',       dot:'bg-red-500',    icon:Dumbbell  },
  MrgClient: { label:'Morning', color:'bg-amber-500',  light:'bg-amber-50 text-amber-700 border-amber-200', dot:'bg-amber-500',  icon:Sun       },
  EveClient: { label:'Evening', color:'bg-indigo-600', light:'bg-indigo-50 text-indigo-700 border-indigo-200',dot:'bg-indigo-500',icon:Moon      },
  GOLD:      { label:'Gold',    color:'bg-yellow-500', light:'bg-yellow-50 text-yellow-700 border-yellow-200',dot:'bg-yellow-500',icon:Star      },
  Ladies:    { label:'Ladies',  color:'bg-pink-500',   light:'bg-pink-50 text-pink-700 border-pink-200',     dot:'bg-pink-500',   icon:UserCheck },
};

const MONTH_LABELS = { '2025-09':'Sep 2025','2025-10':'Oct 2025','2025-11':'Nov 2025' };

const parseMonthXLS = (xmlText) => {
  const NS = 'urn:schemas-microsoft-com:office:spreadsheet';
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const getVal = (cell) => {
    const d = cell.getElementsByTagNameNS(NS,'Data')[0];
    return d ? (d.textContent||'').trim() : '';
  };
  const ws = doc.getElementsByTagNameNS(NS,'Worksheet')[0];
  if (!ws) return null;
  const table = ws.getElementsByTagNameNS(NS,'Table')[0];
  if (!table) return null;
  const rows = Array.from(table.getElementsByTagNameNS(NS,'Row'));
  const firstCell = rows[0] ? getVal(Array.from(rows[0].getElementsByTagNameNS(NS,'Cell'))[0]||{}) : '';
  if (!firstCell.includes('Mont') && !firstCell.includes('MonthsReport')) return null;
  const monthMatch = firstCell.match(/(\d{4}):(\d+)\//);
  const month = monthMatch ? `${monthMatch[1]}-${String(monthMatch[2]).padStart(2,'0')}` : null;
  if (!month) return null;
  const records = [];
  rows.forEach(row => {
    const cells = Array.from(row.getElementsByTagNameNS(NS,'Cell'));
    const vals = cells.map(getVal);
    if (vals.length >= 7 && /^\d+$/.test(vals[0])) {
      records.push({ id:vals[0], name:vals[1].trim(), dept:vals[2].trim(), shift:vals[3].trim(),
        workDays:parseFloat(vals[4])||0, attendDays:parseFloat(vals[5])||0, absentDays:parseFloat(vals[6])||0,
        lateMins:parseInt(vals[7])||0, lateTimes:parseInt(vals[8])||0, earlyMins:parseInt(vals[9])||0,
        earlyTimes:parseInt(vals[10])||0, otHours:parseFloat(vals[11])||0 });
    }
  });
  return { month, records };
};

const Pill = ({ attend, work }) => {
  const pct = work > 0 ? Math.round((attend/work)*100) : 0;
  const c = pct>=80?'bg-emerald-100 text-emerald-700':pct>=50?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600';
  return <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${c}`}>{pct}%</span>;
};

const LinkModal = ({ record, members, onSave, onClose }) => {
  const [search, setSearch] = useState(record.name.toLowerCase());
  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) || m.attendanceId === record.attendanceId
  ).slice(0, 10);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Link Attendance ID</p>
            <p className="text-xs opacity-60">XLS ID <strong>{record.attendanceId}</strong> · {record.name}</p>
          </div>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500 mb-2">Select the registered member to link:</p>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search member name..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-300"/>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {filtered.length===0
              ? <p className="text-xs text-slate-400 text-center py-4">No members found</p>
              : filtered.map(m=>(
                <button key={m._id} onClick={()=>onSave(m._id, record.attendanceId)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">{m.name?.[0]?.toUpperCase()}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                    <p className="text-[10px] text-slate-400">{m.phone} {m.attendanceId?`· ID:${m.attendanceId}`:''}</p>
                  </div>
                  {m.attendanceId===record.attendanceId && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Already linked</span>}
                </button>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

const PaginationBar = ({ page, totalPages, filteredCount, onPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
      <p className="text-xs text-slate-400">Showing {Math.min((page-1)*PER_PAGE+1,filteredCount)}–{Math.min(page*PER_PAGE,filteredCount)} of {filteredCount}</p>
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

const toGSheetCsvUrl = (url) => {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const id = idMatch[1];
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
};

const parseAttendanceCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  const byMonth = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 8) continue;
    const month = cols[4]?.trim();
    if (!month) continue;
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push({
      id:         cols[0]?.trim(),
      name:       cols[1]?.trim(),
      dept:       cols[2]?.trim(),
      shift:      cols[3]?.trim(),
      workDays:   parseFloat(cols[5]) || 0,
      attendDays: parseFloat(cols[6]) || 0,
      absentDays: parseFloat(cols[7]) || 0,
      lateMins:   parseInt(cols[9])   || 0,
      lateTimes:  parseInt(cols[10])  || 0,
      otHours:    parseFloat(cols[11])|| 0,
    });
  }
  return Object.keys(byMonth).length ? byMonth : null;
};

const Attendance = () => {
  const userRole = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').role || ''; } catch { return ''; } })();
  const isAdmin = userRole === 'admin' || userRole === 'trainer';
  const fileRef    = useRef(null);
  const csvFileRef = useRef(null);
  const [records,          setRecords]          = useState([]);
  const [months,           setMonths]           = useState([]);
  const [members,          setMembers]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [importing,        setImporting]        = useState(false);
  const [importLog,        setImportLog]        = useState([]);
  const [activeDept,       setActiveDept]       = useState('ALL');
  const [activeMonth,      setActiveMonth]      = useState('');
  const [search,           setSearch]           = useState('');
  const [sortCol,          setSortCol]          = useState('name');
  const [sortDir,          setSortDir]          = useState('asc');
  const [linkTarget,       setLinkTarget]       = useState(null);
  const [page,             setPage]             = useState(1);
  const [showCsvImport,    setShowCsvImport]    = useState(false);
  const [csvTab,           setCsvTab]           = useState('link');
  const [csvLink,          setCsvLink]          = useState('');
  const [csvLinkLoading,   setCsvLinkLoading]   = useState(false);
  const [showDeleteConfirm,setShowDeleteConfirm]= useState(false);
  const [deletingAll,      setDeletingAll]      = useState(false);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchRecords(); }, [activeMonth, activeDept]);
  useEffect(() => { setPage(1); }, [search, activeDept, activeMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, regRes] = await Promise.allSettled([
        CustomBaseUrl.get(`/xls-attendance/months`),
        CustomBaseUrl.get(`/fetch`),
      ]);
      if (mRes.status==='fulfilled') {
        const ms = mRes.value.data?.months || [];
        setMonths(ms);
        if (ms.length > 0) setActiveMonth(ms[0]);
      }
      if (regRes.status==='fulfilled') setMembers(regRes.value.data?.data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchRecords = async () => {
    try {
      const params = {};
      if (activeMonth) params.month = activeMonth;
      if (activeDept !== 'ALL') params.dept = activeDept;
      const res = await CustomBaseUrl.get(`/xls-attendance`, { params });
      setRecords(res.data?.records || []);
    } catch(e) { console.error(e); }
  };

  const handleFiles = async (files) => {
    setImporting(true);
    const logs = [];
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = parseMonthXLS(text);
        if (!parsed) { logs.push({ t:'warn', m:`⚠️ ${file.name} — not a Month report` }); continue; }
        const res = await CustomBaseUrl.post(`/xls-attendance/import`, {
          month: parsed.month, sourceFile: file.name, records: parsed.records,
        });
        logs.push({ t:'success', m:`✅ ${file.name} — ${res.data.inserted} saved (${MONTH_LABELS[parsed.month]||parsed.month})` });
        await fetchData();
        setActiveMonth(parsed.month);
        await fetchRecords();
      } catch(e) {
        logs.push({ t:'error', m:`❌ ${file.name} — ${e.response?.data?.message||e.message}` });
      }
    }
    setImportLog(prev => [...logs, ...prev].slice(0, 15));
    setImporting(false);
  };

  const handleLink = async (registrationId, attendanceId) => {
    try {
      await CustomBaseUrl.post(`/xls-attendance/link`, { registrationId, attendanceId });
      setLinkTarget(null);
      await fetchData();
      await fetchRecords();
    } catch(e) { alert('Link failed: ' + (e.response?.data?.message||e.message)); }
  };

  const importCsvText = async (text, sourceName) => {
    const byMonth = parseAttendanceCSV(text);
    if (!byMonth) {
      setImportLog(prev => [{ t:'warn', m:`⚠️ ${sourceName} — no valid rows found` }, ...prev].slice(0,15));
      return;
    }
    const logs = [];
    for (const [month, recs] of Object.entries(byMonth)) {
      try {
        const res = await CustomBaseUrl.post(`/xls-attendance/import`, { month, sourceFile: sourceName, records: recs });
        logs.push({ t:'success', m:`✅ ${sourceName} — ${res.data.inserted} saved (${MONTH_LABELS[month]||month})` });
        setActiveMonth(month);
      } catch(e) {
        logs.push({ t:'error', m:`❌ ${sourceName} (${month}) — ${e.response?.data?.message||e.message}` });
      }
    }
    setImportLog(prev => [...logs, ...prev].slice(0,15));
    await fetchData();
    await fetchRecords();
  };

  const handleCsvFile = async (files) => {
    setImporting(true);
    for (const file of files) {
      const text = await file.text();
      await importCsvText(text, file.name);
    }
    setImporting(false);
    setShowCsvImport(false);
  };

  const handleCsvLinkImport = async () => {
    if (!csvLink.trim()) return;
    const exportUrl = toGSheetCsvUrl(csvLink.trim());
    if (!exportUrl) {
      setImportLog(prev => [{ t:'error', m:'❌ Invalid Google Sheet URL — make sure it contains /spreadsheets/d/...' }, ...prev].slice(0,15));
      return;
    }
    setCsvLinkLoading(true);
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await importCsvText(text, 'Google Sheet');
      setShowCsvImport(false);
      setCsvLink('');
    } catch(e) {
      setImportLog(prev => [{ t:'error', m:`❌ Failed to fetch Google Sheet: ${e.message}` }, ...prev].slice(0,15));
    }
    setCsvLinkLoading(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await CustomBaseUrl.delete(`/xls-attendance`);
      setShowDeleteConfirm(false);
      setRecords([]);
      setMonths([]);
      setActiveMonth('');
      setImportLog(prev => [{ t:'success', m:'✅ All attendance records deleted' }, ...prev].slice(0,15));
    } catch(e) {
      alert('Delete failed: ' + (e.response?.data?.message||e.message));
    }
    setDeletingAll(false);
  };

  const exportCSV = () => {
    const header = ['AttID','Name','Dept','Shift','Month','Work','Attend','Absent','Att%','LateMins','LateX','OT Hrs','Linked Member'];
    const rows = filtered.map(r => {
      const pct = r.workDays > 0 ? Math.round((r.attendDays/r.workDays)*100) : 0;
      return [r.attendanceId, r.name, r.dept, r.shift, r.month, r.workDays, r.attendDays, r.absentDays, pct+'%', r.lateMins, r.lateTimes, r.otHours, r.registrationId?.name||''];
    });
    const csv = [header,...rows].map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `attendance_${activeDept}_${activeMonth}.csv`;
    a.click();
  };

  const depts = ['ALL', ...Object.keys(DEPT).filter(d => records.some(r=>r.dept===d))];

  const filtered = records
    .filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || String(r.attendanceId).includes(search))
    .sort((a,b) => {
      let av = a[sortCol]??'', bv = b[sortCol]??'';
      if(typeof av==='string') av=av.toLowerCase();
      if(typeof bv==='string') bv=bv.toLowerCase();
      return sortDir==='asc' ? (av>bv?1:-1) : (av<bv?1:-1);
    });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const sort = col => {
    if(sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const Th = ({col, label}) => (
    <th onClick={()=>sort(col)} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 whitespace-nowrap select-none">
      {label}{sortCol===col?(sortDir==='asc'?' ↑':' ↓'):''}
    </th>
  );

  const stats = {
    total: filtered.length,
    linked: filtered.filter(r=>r.registrationId).length,
    avgAtt: filtered.length ? Math.round(filtered.reduce((s,r)=>s+(r.workDays?r.attendDays/r.workDays:0),0)/filtered.length*100) : 0,
    totalOT: filtered.reduce((s,r)=>s+(r.otHours||0),0).toFixed(1),
  };

  const hasData = records.length > 0 || months.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar/>
      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Attendance</h1>
            <p className="text-xs text-slate-400 mt-0.5">Import XLS files · Data saved to DB · Filter by dept & month</p>
          </div>
          <div className="flex items-center gap-2">
            {hasData && <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 shadow-sm"><Download size={13}/> CSV</button>}
            <button onClick={()=>fetchData()} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 shadow-sm"><RefreshCw size={13} className={loading?'animate-spin':''}/></button>
            {isAdmin && <>
              <button onClick={()=>{ setShowCsvImport(v=>!v); setCsvTab('link'); }} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 shadow-sm">
                <FileText size={13}/> Import CSV
              </button>
              <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 shadow-sm">
                <Upload size={13}/> {importing?'Saving to DB…':'Import XLS'}
              </button>
            </>}
            <input ref={fileRef}    type="file" accept=".xls,.XLS" multiple className="hidden" onChange={e=>handleFiles(Array.from(e.target.files))}/>
            <input ref={csvFileRef} type="file" accept=".csv,.CSV" multiple className="hidden" onChange={e=>handleCsvFile(Array.from(e.target.files))}/>
          </div>
        </div>

        {showCsvImport && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Import CSV</p>
              <button onClick={()=>setShowCsvImport(false)}><X size={14} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit">
              {['link','file'].map(t=>(
                <button key={t} onClick={()=>setCsvTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${csvTab===t?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                  {t==='link'?<><ExternalLink size={11} className="inline mr-1"/>Google Sheet Link</>:<><FileText size={11} className="inline mr-1"/>Upload CSV File</>}
                </button>
              ))}
            </div>

            {csvTab==='link' && (
              <div>
                <p className="text-[11px] text-slate-500 mb-2">Paste your Google Sheet URL. The sheet must be shared as <strong>"Anyone with the link can view"</strong> and have the same column format as the exported CSV.</p>
                <div className="flex gap-2">
                  <input value={csvLink} onChange={e=>setCsvLink(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                  <button onClick={handleCsvLinkImport} disabled={csvLinkLoading||!csvLink.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 transition">
                    {csvLinkLoading?<><RefreshCw size={12} className="animate-spin"/>Fetching…</>:<><Download size={12}/>Import</>}
                  </button>
                </div>
                <details className="mt-3">
                  <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">📋 Expected CSV column format</summary>
                  <div className="mt-2 bg-slate-50 rounded-xl p-3 overflow-x-auto">
                    <code className="text-[10px] text-slate-600 whitespace-pre">AttID,Name,Dept,Shift,Month,Work,Attend,Absent,Att%,LateMins,LateX,OT Hrs,Linked Member</code>
                  </div>
                </details>
              </div>
            )}

            {csvTab==='file' && (
              <div>
                <p className="text-[11px] text-slate-500 mb-3">Upload a CSV file with the same column format as the exported attendance CSV.</p>
                <button onClick={()=>csvFileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 text-center hover:border-emerald-400 hover:bg-emerald-50 transition cursor-pointer">
                  <FileText size={24} className="mx-auto mb-2 text-slate-300"/>
                  <p className="text-xs font-semibold text-slate-500">Click to browse CSV file</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Headers: AttID, Name, Dept, Shift, Month, Work, Attend, Absent, Att%, LateMins, LateX, OT Hrs</p>
                </button>
              </div>
            )}
          </div>
        )}

        {!hasData && !loading && isAdmin && (
          <div onDrop={e=>{e.preventDefault();handleFiles(Array.from(e.dataTransfer.files));}} onDragOver={e=>e.preventDefault()}
            onClick={()=>fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-2xl p-14 text-center cursor-pointer hover:border-slate-400 hover:bg-white transition mb-5 bg-white">
            <Upload size={32} className="mx-auto mb-3 text-slate-300"/>
            <p className="font-semibold text-slate-600 text-sm">Drop XLS month files here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">Data will be saved to MongoDB and persist across refreshes</p>
          </div>
        )}

        {loading && <div className="text-center py-12 text-slate-400 text-sm">Loading attendance data…</div>}

        {importLog.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-slate-600">Import Log</p>
              <button onClick={()=>setImportLog([])} className="text-[10px] text-slate-400 hover:text-slate-600">Clear</button>
            </div>
            {importLog.map((l,i)=>(
              <p key={i} className={`text-[11px] leading-relaxed ${l.t==='error'?'text-red-600':l.t==='warn'?'text-amber-600':'text-emerald-600'}`}>{l.m}</p>
            ))}
          </div>
        )}

        {hasData && !loading && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                {label:'Records',     val:stats.total,   icon:Users,        c:'text-slate-700 bg-slate-100'},
                {label:'Avg Attend%', val:stats.avgAtt+'%', icon:CheckCircle, c:'text-emerald-700 bg-emerald-100'},
                {label:'Linked',      val:`${stats.linked}/${stats.total}`, icon:Link, c:'text-blue-700 bg-blue-100'},
                {label:'Total OT Hrs',val:stats.totalOT, icon:Clock,        c:'text-violet-700 bg-violet-100'},
              ].map(({label,val,icon:Icon,c})=>(
                <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c}`}><Icon size={16}/></div>
                  <div><p className="text-lg font-black text-slate-900">{val}</p><p className="text-[10px] text-slate-400">{label}</p></div>
                </div>
              ))}
            </div>

            {stats.linked < stats.total && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2.5">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0"/>
                <p className="text-xs text-amber-800"><strong>{stats.total - stats.linked} records</strong> not linked to a registered member. Click the Link button on any row.</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                {months.map(m=>(
                  <button key={m} onClick={()=>{setActiveMonth(m); setPage(1);}}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${activeMonth===m?'bg-slate-800 text-white':'text-slate-500 hover:text-slate-700'}`}>
                    {MONTH_LABELS[m]||m}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {depts.map(d=>{
                  const cfg=DEPT[d];
                  const cnt=records.filter(r=>d==='ALL'||r.dept===d).length;
                  return (
                    <button key={d} onClick={()=>{setActiveDept(d); setPage(1);}}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        activeDept===d ? (cfg?`${cfg.color} text-white border-transparent shadow-sm`:'bg-slate-800 text-white border-transparent') : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}>
                      {cfg&&<cfg.icon size={11}/>}
                      {cfg?cfg.label:'All'}
                      <span className={`text-[9px] font-black ${activeDept===d?'opacity-70':'text-slate-400'}`}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative ml-auto">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name / ID…"
                  className="pl-7 pr-7 py-1.5 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-300 w-40"/>
                {search&&<button onClick={()=>setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={11} className="text-slate-400"/></button>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  {activeDept==='ALL'?'All Departments':DEPT[activeDept]?.label||activeDept}
                  {activeMonth?` · ${MONTH_LABELS[activeMonth]||activeMonth}`:''} · {filtered.length} records
                </p>
                <div className="flex items-center gap-3">
                  {isAdmin && <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 transition">
                    <Upload size={10}/> Import more
                  </button>}
                  <button onClick={()=>setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition">
                    <Trash2 size={10}/> Delete All
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <Th col="attendanceId" label="XLS ID"/>
                      <Th col="name"         label="Name"/>
                      <Th col="dept"         label="Dept"/>
                      <Th col="shift"        label="Shift"/>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Linked Member</th>
                      <Th col="workDays"   label="Work"/>
                      <Th col="attendDays" label="Attend"/>
                      <Th col="absentDays" label="Absent"/>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Att%</th>
                      <Th col="lateMins"  label="Late Min"/>
                      <Th col="lateTimes" label="Late ×"/>
                      <Th col="otHours"   label="OT"/>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginated.length===0 ? (
                      <tr><td colSpan={13} className="text-center py-10 text-slate-400 text-xs">No records — import a Month XLS file</td></tr>
                    ) : paginated.map((r,i) => {
                      const cfg=DEPT[r.dept]||{};
                      const linked=r.registrationId;
                      return (
                        <tr key={r._id||i} className={`hover:bg-slate-50 transition ${!linked?'bg-amber-50/30':''}`}>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-500">{r.attendanceId}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{r.name}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.light||'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {cfg.dot&&<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>}
                              {cfg.label||r.dept}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">{r.shift}</td>
                          <td className="px-3 py-2.5">
                            {linked ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[9px]">{linked.name?.[0]?.toUpperCase()}</div>
                                <span className="text-[11px] font-semibold text-emerald-700">{linked.name}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-500 font-medium">Not linked</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 font-medium">{r.workDays}</td>
                          <td className="px-3 py-2.5 font-bold text-emerald-600">{r.attendDays||'—'}</td>
                          <td className="px-3 py-2.5 font-bold text-red-500">{r.absentDays}</td>
                          <td className="px-3 py-2.5"><Pill attend={r.attendDays} work={r.workDays}/></td>
                          <td className="px-3 py-2.5 text-slate-400">{r.lateMins||'—'}</td>
                          <td className="px-3 py-2.5 text-slate-400">{r.lateTimes||'—'}</td>
                          <td className="px-3 py-2.5 text-violet-600 font-medium">{r.otHours>0?r.otHours:'—'}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={()=>setLinkTarget(r)}
                              className={`p-1 rounded-lg transition ${linked?'text-emerald-500 hover:bg-emerald-50':'text-amber-500 hover:bg-amber-50'}`}>
                              <Link size={13}/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={page} totalPages={totalPages} filteredCount={filtered.length} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      {linkTarget && (
        <LinkModal record={linkTarget} members={members} onSave={handleLink} onClose={()=>setLinkTarget(null)} />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={()=>setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 bg-red-600 text-white flex items-center gap-3">
              <Trash2 size={16}/>
              <p className="font-bold text-sm">Delete All Attendance</p>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-700 mb-1">Are you sure you want to delete <strong>all attendance records</strong>?</p>
              <p className="text-xs text-slate-400 mb-5">This action cannot be undone. All months and all departments will be cleared.</p>
              <div className="flex gap-2">
                <button onClick={()=>setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button onClick={handleDeleteAll} disabled={deletingAll}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-40 transition flex items-center justify-center gap-1.5">
                  {deletingAll?<><RefreshCw size={12} className="animate-spin"/>Deleting…</>:<><Trash2 size={12}/>Confirm Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
