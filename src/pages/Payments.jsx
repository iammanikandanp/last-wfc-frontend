import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import {
  CreditCard, Plus, Search, X, Filter, Mail, CheckCircle,
  AlertCircle, Clock, ChevronLeft, ChevronRight, Download,
  Wallet, TrendingUp, Users, RefreshCw, Send, Check, Edit3, Trash2, Save,
  FileText, Loader
} from 'lucide-react';

const BASE_URL = 'https://wfc-backend-server.onrender.com';
const GYM_NAME = 'WFC – Wolverine Fitness Club';

// ── PDF generator (reused for invoice downloads in payment list) ──────────────
const generatePaymentPDF = async (p) => {
  const loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, pad = 15;

  doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 45, 'F');
  doc.setFillColor(220, 38, 38); doc.rect(0, 42, W, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('WFC - Wolverine Fitness Club', W / 2, 18, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Your Ultimate Fitness Destination', W / 2, 26, { align: 'center' });
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.3);
  doc.roundedRect(W/2 - 28, 30, 56, 9, 2, 2, 'S');
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('courier', 'normal');
  doc.text(p.invoiceNo || '', W / 2, 35.5, { align: 'center' });

  let y = 58;
  doc.setFillColor(248, 250, 252); doc.roundedRect(pad, y, W - pad*2, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
  doc.roundedRect(pad, y, W - pad*2, 28, 3, 3, 'S');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); doc.text('BILLED TO', pad + 5, y + 7);
  doc.setFontSize(11); doc.setTextColor(15, 23, 42);
  doc.text(p.memberName || '—', pad + 5, y + 14);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text(`📞 ${p.memberPhone || '—'}   ✉ ${p.memberEmail || '—'}`, pad + 5, y + 21);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139); doc.setFontSize(8);
  doc.text('ISSUED ON', W - pad - 35, y + 7);
  doc.setTextColor(15, 23, 42); doc.setFontSize(10);
  doc.text(new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN'), W - pad - 35, y + 14);
  y += 36;

  doc.setFillColor(15, 23, 42); doc.roundedRect(pad, y, W - pad*2, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  const cols = [pad + 5, 90];
  doc.text('DESCRIPTION', cols[0], y + 6); doc.text('DETAILS', cols[1], y + 6);
  y += 13;

  const rows = [
    ['Package / Plan', p.package || '—'],
    ['Payment Mode', (p.paymentMode || '—').toUpperCase()],
    ['Payment Type', p.paymentType === 'partly' ? 'Partly (Advance)' : 'Full Payment'],
    ['Membership Start', p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'],
    ['Membership End',   p.endDate   ? new Date(p.endDate).toLocaleDateString('en-IN')   : '—'],
  ];
  rows.forEach((row, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.rect(pad, y - 4, W - pad*2, 9, 'F');
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    doc.line(pad, y + 5, W - pad, y + 5);
    doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(row[0], cols[0], y + 1.5);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
    doc.text(row[1], cols[1], y + 1.5);
    y += 9;
  });
  y += 6;

  doc.setFillColor(248, 250, 252); doc.roundedRect(W/2, y, W/2 - pad, 36, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
  doc.roundedRect(W/2, y, W/2 - pad, 36, 3, 3, 'S');
  const bx = W/2 + 5;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text('Subtotal', bx, y + 9); doc.text('Discount', bx, y + 18);
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${(p.amount||0).toLocaleString('en-IN')}`, W - pad - 3, y + 9, { align: 'right' });
  doc.setTextColor(220, 38, 38);
  doc.text(`- Rs. ${(p.discount||0).toLocaleString('en-IN')}`, W - pad - 3, y + 18, { align: 'right' });
  doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.5);
  doc.line(W/2 + 3, y + 22, W - pad - 3, y + 22);
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(W/2 + 3, y + 24, W/2 - pad - 3, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PAID', bx, y + 30);
  doc.text(`Rs. ${(p.finalAmount||p.amount||0).toLocaleString('en-IN')}`, W - pad - 5, y + 30, { align: 'right' });
  y += 46;

  doc.setFillColor(15, 23, 42); doc.rect(0, y, W, 30, 'F');
  doc.setFillColor(220, 38, 38); doc.rect(0, y, W, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Thank you for choosing WFC! 💪', W/2, y + 12, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
  doc.text('Keep pushing your limits · Wolverine Fitness Club', W/2, y + 20, { align: 'center' });

  return doc;
};

// ── Invoice List Modal — opens all invoices for a member ──────────────────────
const InvoiceListModal = ({ payment, allPayments, onClose }) => {
  // All payments for the same member
  const memberPayments = allPayments
    .filter(p => String(p.registrationId) === String(payment.registrationId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const [downloading, setDownloading] = useState(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);

  const downloadSingle = async (p) => {
    if (downloading.has(p._id)) return;
    // If PDF URL stored in Cloudinary, open directly
    if (p.pdfUrl) {
      window.open(p.pdfUrl, '_blank');
      return;
    }
    setDownloading(prev => new Set([...prev, p._id]));
    try {
      const doc = await generatePaymentPDF(p);
      const fileName = `WFC-Invoice-${p.invoiceNo}-${(p.memberName||'').replace(/\s+/g,'-')}.pdf`;
      doc.save(fileName);
    } catch(e) {
      alert('Could not generate PDF: ' + e.message);
    } finally {
      setDownloading(prev => { const s = new Set(prev); s.delete(p._id); return s; });
    }
  };

  const downloadAll = async () => {
    setDownloadingAll(true);
    for (const p of memberPayments) {
      try {
        if (p.pdfUrl) {
          // For cloud-hosted PDFs, open each in new tab with a short delay
          window.open(p.pdfUrl, '_blank');
          await new Promise(r => setTimeout(r, 400));
        } else {
          const doc = await generatePaymentPDF(p);
          const fileName = `WFC-Invoice-${p.invoiceNo}-${(p.memberName||'').replace(/\s+/g,'-')}.pdf`;
          doc.save(fileName);
          await new Promise(r => setTimeout(r, 300));
        }
      } catch(e) { console.warn('Skip', p.invoiceNo, e.message); }
    }
    setDownloadingAll(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-4 flex items-center justify-between text-white">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={16}/>
              <p className="font-bold text-sm">Invoices</p>
            </div>
            <p className="text-xs opacity-60 mt-0.5">{payment.memberName} · {memberPayments.length} payment{memberPayments.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {memberPayments.length > 1 && (
              <button onClick={downloadAll} disabled={downloadingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition disabled:opacity-50">
                {downloadingAll
                  ? <Loader size={12} className="animate-spin"/>
                  : <Download size={12}/>}
                Download All
              </button>
            )}
            <button onClick={onClose}><X size={16} className="opacity-60 hover:opacity-100"/></button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto divide-y divide-slate-50">
          {memberPayments.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm">No invoices found</p>
          ) : memberPayments.map((p) => {
            const isPending = p.balanceAmount > 0;
            const isLoading = downloading.has(p._id);
            return (
              <div key={p._id} className={`px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition ${isPending ? 'bg-amber-50/40' : ''}`}>
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPending ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <FileText size={16} className={isPending ? 'text-amber-600' : 'text-emerald-600'}/>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-800 font-mono">{p.invoiceNo}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isPending ? 'Pending' : 'Paid'}
                    </span>
                    {p.pdfUrl && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Cloud</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {p.package} · {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-slate-800">₹{(p.finalAmount||p.amount||0).toLocaleString('en-IN')}</p>
                  {isPending && (
                    <p className="text-[10px] text-red-500 font-semibold">Due ₹{p.balanceAmount.toLocaleString('en-IN')}</p>
                  )}
                </div>

                {/* Download button */}
                <button onClick={() => downloadSingle(p)} disabled={isLoading}
                  title={p.pdfUrl ? 'Open invoice PDF' : 'Generate & download invoice'}
                  className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition disabled:opacity-50 flex-shrink-0">
                  {isLoading
                    ? <Loader size={13} className="animate-spin"/>
                    : <Download size={13}/>}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {memberPayments.filter(p => p.pdfUrl).length} cloud-hosted · {memberPayments.filter(p => !p.pdfUrl).length} will be generated
          </p>
          <button onClick={onClose}
            className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-white transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Email Reminder Modal — sends via backend (real email, not draft) ──────────
const EmailModal = ({ payment, onClose }) => {
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errMsg, setErrMsg] = useState('');
  const [pdfFound, setPdfFound] = useState(null); // null=unknown, true/false after send

  const noEmail = !payment.memberEmail;

  const handleSend = async () => {
    if (noEmail) return;
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await CustomBaseUrl.post(`/send-email`, {
        to:            payment.memberEmail,
        memberName:    payment.memberName,
        invoiceNo:     payment.invoiceNo,
        amount:        payment.amount,
        finalAmount:   payment.finalAmount,
        balanceAmount: payment.balanceAmount || 0,
        packageName:   payment.package,
        startDate:     payment.startDate,
        endDate:       payment.endDate,
        paymentMode:   payment.paymentMode,
        pdfUrl:        payment.pdfUrl || '',   // backend checks DB too
        isReminder:    true,
      });

      if (res.data.success) {
        setPdfFound(res.data.pdfIncluded);
        setStatus('success');
      } else {
        setErrMsg(res.data.message || 'Failed to send email');
        setStatus('error');
      }
    } catch (e) {
      setErrMsg(e.response?.data?.message || e.message || 'Network error');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Mail size={18}/>
            <p className="font-bold text-sm">Send Balance Reminder</p>
          </div>
          <button onClick={onClose}><X size={16} className="text-white/70 hover:text-white"/></button>
        </div>

        {/* Success */}
        {status === 'success' && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-green-600"/>
            </div>
            <p className="font-bold text-slate-800 mb-1">Reminder Sent! ✅</p>
            <p className="text-xs text-slate-500 mb-1">
              Email delivered to <strong>{payment.memberEmail}</strong>
            </p>
            {pdfFound !== null && (
              <p className={`text-xs mb-4 font-medium ${pdfFound ? 'text-emerald-600' : 'text-amber-600'}`}>
                {pdfFound
                  ? '📄 Invoice PDF link included in email'
                  : '⚠️ No PDF found — email sent without invoice link'}
              </p>
            )}
            <button onClick={onClose}
              className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition">
              Done
            </button>
          </div>
        )}

        {/* Form */}
        {status !== 'success' && (
          <div className="p-5">
            {/* Email content preview */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-500 uppercase tracking-wide text-[10px] mb-2">Email Preview</p>

              <p><strong>To:</strong> {payment.memberEmail || <span className="text-red-500">No email on file</span>}</p>
              <p className="mt-1"><strong>Subject:</strong> ⚠️ Balance Reminder – {GYM_NAME}</p>

              <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-slate-500">
                <p>Dear <strong className="text-slate-700">{payment.memberName}</strong>,</p>
                <p>We hope you are enjoying your fitness journey at {GYM_NAME}!</p>
                <p>This is a friendly reminder that you have a pending balance of{' '}
                  <strong className="text-red-600">₹{(payment.balanceAmount||0).toLocaleString('en-IN')}</strong>{' '}
                  on your membership account.
                </p>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200 my-2 space-y-0.5">
                  <p>Invoice No : <strong>{payment.invoiceNo || '—'}</strong></p>
                  <p>Package    : <strong>{payment.package   || '—'}</strong></p>
                  <p>Due Amount : <strong className="text-red-600">₹{(payment.balanceAmount||0).toLocaleString('en-IN')}</strong></p>
                  {payment.pdfUrl && (
                    <p className="text-blue-600 font-medium">📄 Invoice PDF link will be included</p>
                  )}
                  {!payment.pdfUrl && (
                    <p className="text-amber-600">🔍 Backend will check DB for PDF link automatically</p>
                  )}
                </div>
                <p>Kindly clear the balance at your earliest convenience...</p>
                <p className="text-slate-400 italic">Warm regards, {GYM_NAME} 📍 Coimbatore</p>
              </div>
            </div>

            {noEmail && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                <AlertCircle size={13} className="text-amber-600 flex-shrink-0"/>
                <p className="text-xs text-amber-700">No email address on file. Add it in the member's profile first.</p>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
                <p className="text-xs text-red-700 font-medium">❌ {errMsg}</p>
                <p className="text-[10px] text-red-500 mt-0.5">Check that EMAIL_USER and EMAIL_PASS are set in Render environment variables.</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleSend}
                disabled={noEmail || status === 'sending'}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40">
                {status === 'sending'
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/> Sending…</>
                  : <><Send size={14}/> Send Reminder Now</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes su{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
};

// ── Edit Payment Modal ────────────────────────────────────────────────────────
const EditPaymentModal = ({ payment, onSave, onClose }) => {
  const [saving, setSaving]   = useState(false);
  const [errMsg, setErrMsg]   = useState('');
  const [form,   setForm]     = useState({
    paymentMode:   payment.paymentMode  || 'cash',
    paymentType:   payment.paymentType  || 'full',
    amount:        payment.amount       || 0,
    finalAmount:   payment.finalAmount  || 0,
    discount:      payment.discount     || 0,
    advanceAmount: payment.advanceAmount|| 0,
    balanceAmount: payment.balanceAmount|| 0,
    startDate:     payment.startDate?.split('T')[0] || '',
    endDate:       payment.endDate?.split('T')[0]   || '',
    package:       payment.package      || '',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => {
      const upd = { ...f, [name]: value };
      // Auto-recalc balance if advance changes
      if (name === 'advanceAmount') {
        upd.balanceAmount = Math.max(0, (upd.finalAmount || 0) - parseFloat(value || 0));
      }
      if (name === 'finalAmount') {
        upd.balanceAmount = Math.max(0, parseFloat(value||0) - (upd.advanceAmount||0));
      }
      if (name === 'paymentType' && value === 'full') {
        upd.advanceAmount = upd.finalAmount;
        upd.balanceAmount = 0;
      }
      return upd;
    });
  };

  const handleSave = async () => {
    setSaving(true); setErrMsg('');
    try {
      await CustomBaseUrl.put(`/reg-payments/${payment._id}`, form);
      onSave();
      onClose();
    } catch(e) {
      setErrMsg(e.response?.data?.message || e.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const Field = ({ label, name, type='text', options }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {options ? (
        <select name={name} value={form[name]} onChange={handleChange}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
      ) : (
        <input name={name} type={type} value={form[name]} onChange={handleChange}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>

        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between text-white">
          <div>
            <p className="font-bold text-sm">Edit Payment</p>
            <p className="text-xs opacity-60">{payment.memberName} · {payment.invoiceNo}</p>
          </div>
          <button onClick={onClose}><X size={16} className="opacity-60 hover:opacity-100"/></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment Mode" name="paymentMode" options={[
              {val:'cash',label:'💵 Cash'},{val:'upi',label:'📱 UPI'},{val:'card',label:'💳 Card'}
            ]}/>
            <Field label="Payment Type" name="paymentType" options={[
              {val:'full',label:'✅ Full'},{val:'partly',label:'⚡ Partly'}
            ]}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Amount (₹)" name="amount"      type="number"/>
            <Field label="Discount (₹)"     name="discount"    type="number"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Final Amount (₹)" name="finalAmount"   type="number"/>
            <Field label="Advance Paid (₹)" name="advanceAmount" type="number"/>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Balance Due</span>
            <span className={`text-xl font-black ${form.balanceAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              ₹{Number(form.balanceAmount||0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" name="startDate" type="date"/>
            <Field label="End Date"   name="endDate"   type="date"/>
          </div>
          <Field label="Package" name="package"/>

          {errMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">{errMsg}</div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-40">
            {saving ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving…</> : <><Save size={14}/> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
const DeletePaymentModal = ({ payment, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
      onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trash2 size={24} className="text-red-600"/>
      </div>
      <h3 className="font-bold text-slate-900 text-lg mb-1">Delete Payment?</h3>
      <p className="text-slate-500 text-sm mb-1">
        <strong>{payment.memberName}</strong> · {payment.invoiceNo}
      </p>
      <p className="text-slate-400 text-xs mb-5">
        ₹{(payment.finalAmount||payment.amount||0).toLocaleString('en-IN')} · This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

// ── Main Payments Page ────────────────────────────────────────────────────────
const Payments = () => {
  const navigate  = useNavigate();
  const [payments,   setPayments]   = useState([]);
  const [members,    setMembers]    = useState([]);  // to look up email
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter,     setFilter]     = useState('all');   // all | full | pending
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [emailTarget,   setEmailTarget]   = useState(null);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null);
  const PER_PAGE = 20;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [pRes, mRes] = await Promise.allSettled([
        CustomBaseUrl.get(`/reg-payments`),
        CustomBaseUrl.get(`/fetch`),
      ]);

      if (pRes.status === 'fulfilled') {
        const data = pRes.value.data;
        console.log('Payments API response:', data);
        // Backend returns { payments: [...] } or { data: [...] }
        const list = data?.payments || data?.data || [];
        setPayments(list);
        if (list.length === 0) console.warn('Payments array is empty from API');
      } else {
        const errMsg = pRes.reason?.response?.data?.message || pRes.reason?.message || 'API error';
        console.error('Payments fetch failed:', errMsg, pRes.reason);
        setFetchError(`Could not load payments: ${errMsg}`);
      }

      if (mRes.status === 'fulfilled') {
        setMembers(mRes.value.data?.data || []);
      }
    } catch(e) {
      console.error('fetchAll error:', e);
      setFetchError(e.message);
    }
    finally { setLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await CustomBaseUrl.delete(`/reg-payments/${deleteTarget._id}`);
      setPayments(prev => prev.filter(p => p._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch(e) {
      alert('Delete failed: ' + (e.response?.data?.message || e.message));
    }
  };

  // Enrich payment with member email from Registration
  // Must use String() because MongoDB _id is an ObjectId, not a plain string
  const enriched = payments.map(p => {
    const member = members.find(m => String(m._id) === String(p.registrationId));
    return { ...p, memberEmail: member?.emails || p.memberEmail || '' };
  });

  // Filter
  const filtered = enriched
    .filter(p => {
      if (filter === 'full')    return !p.balanceAmount || p.balanceAmount <= 0;
      if (filter === 'pending') return p.balanceAmount  && p.balanceAmount  > 0;
      return true;
    })
    .filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.memberName?.toLowerCase().includes(q) ||
        p.memberPhone?.includes(q) ||
        p.invoiceNo?.toLowerCase().includes(q) ||
        p.package?.toLowerCase().includes(q)
      );
    });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page on filter/search change
  useEffect(() => setPage(1), [filter, search]);

  // Stats
  const totalRevenue  = payments.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0);
  const totalPending  = payments.reduce((s, p) => s + (p.balanceAmount || 0), 0);
  const pendingCount  = payments.filter(p => p.balanceAmount > 0).length;
  const fullCount     = payments.filter(p => !p.balanceAmount || p.balanceAmount <= 0).length;

  const modeColor = (m) => ({
    cash:  'bg-emerald-100 text-emerald-700',
    upi:   'bg-violet-100 text-violet-700',
    card:  'bg-blue-100 text-blue-700',
    online:'bg-indigo-100 text-indigo-700',
  }[(m||'').toLowerCase()] || 'bg-slate-100 text-slate-600');

  const FILTERS = [
    { key:'all',     label:`All (${payments.length})`,     icon: CreditCard },
    { key:'full',    label:`Full Paid (${fullCount})`,     icon: CheckCircle },
    { key:'pending', label:`Pending (${pendingCount})`,    icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar/>
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Payments</h1>
            <p className="text-xs text-slate-400 mt-0.5">All transactions · {payments.length} records</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm">
              <RefreshCw size={14} className={`text-slate-500 ${loading?'animate-spin':''}`}/>
            </button>
            <button onClick={() => navigate('/payments/new')}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition shadow-sm">
              <Plus size={14}/> New Payment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label:'Total Revenue',  val:`₹${totalRevenue.toLocaleString('en-IN')}`, icon:TrendingUp,   c:'text-emerald-600 bg-emerald-50' },
            { label:'Total Pending',  val:`₹${totalPending.toLocaleString('en-IN')}`, icon:AlertCircle,  c:'text-red-600 bg-red-50' },
            { label:'Full Payments',  val:fullCount,                                   icon:CheckCircle,  c:'text-blue-600 bg-blue-50' },
            { label:'Pending Members',val:pendingCount,                                icon:Clock,        c:'text-amber-600 bg-amber-50' },
          ].map(({label,val,icon:Icon,c}) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c}`}><Icon size={16}/></div>
              <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-base font-black text-slate-900">{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls: Filter + Search */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {FILTERS.map(({key,label,icon:Icon}) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter===key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <Icon size={11}/> {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name / phone / invoice…"
              className="pl-7 pr-7 py-1.5 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-300 w-48 shadow-sm"/>
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={11} className="text-slate-400"/></button>}
          </div>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0"/>
            <p className="text-sm text-red-700 font-medium">{fetchError}</p>
            <button onClick={fetchAll} className="ml-auto text-xs text-red-600 underline hover:text-red-800">Retry</button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <RefreshCw size={24} className="animate-spin text-slate-300 mx-auto mb-2"/>
            <p className="text-xs text-slate-400">Loading payments…</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">
                {filter === 'all' ? 'All Payments' : filter === 'full' ? 'Full Payments' : 'Pending Payments'}
                · {filtered.length} records
              </p>
              <p className="text-xs text-slate-400">Page {page} of {totalPages||1}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['#','Member','Package','Amount','Balance','Mode','Type','Date','Actions'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-slate-400">No records found</td></tr>
                  ) : paginated.map((p, i) => {
                    const isPending = p.balanceAmount > 0;
                    return (
                      <tr key={p._id} className={`hover:bg-slate-50 transition ${isPending ? 'bg-amber-50/40' : ''}`}>
                        {/* Row # */}
                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[10px]">
                          {(page-1)*PER_PAGE + i + 1}
                        </td>
                        {/* Member */}
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-800 whitespace-nowrap">{p.memberName || '—'}</p>
                          <p className="text-[10px] text-slate-400">{p.memberPhone}</p>
                        </td>
                        {/* Package */}
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{p.package || '—'}</td>
                        {/* Amount */}
                        <td className="px-3 py-2.5 font-bold text-emerald-600 whitespace-nowrap">
                          ₹{(p.finalAmount || p.amount || 0).toLocaleString('en-IN')}
                        </td>
                        {/* Balance */}
                        <td className="px-3 py-2.5">
                          {isPending ? (
                            <span className="font-bold text-red-600 whitespace-nowrap">₹{p.balanceAmount.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle size={11}/> Paid</span>
                          )}
                        </td>
                        {/* Mode */}
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${modeColor(p.paymentMode)}`}>
                            {p.paymentMode || '—'}
                          </span>
                        </td>
                        {/* Type */}
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.paymentType === 'partly' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {p.paymentType === 'partly' ? 'Part' : 'Full'}
                          </span>
                        </td>
                        {/* Date */}
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {/* Invoice download */}
                            <button onClick={() => setInvoiceTarget(p)} title="View & download invoices"
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition">
                              <FileText size={13}/>
                            </button>
                            {/* Edit */}
                            <button onClick={() => setEditTarget(p)} title="Edit payment"
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition">
                              <Edit3 size={13}/>
                            </button>
                            {/* Delete */}
                            <button onClick={() => setDeleteTarget(p)} title="Delete payment"
                              className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition">
                              <Trash2 size={13}/>
                            </button>
                            {/* Reminder email — only for pending */}
                            {isPending && (
                              <button onClick={() => setEmailTarget(p)} title="Send reminder email"
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition">
                                <Mail size={13}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition">
                    <ChevronLeft size={14} className="text-slate-600"/>
                  </button>
                  {/* Page numbers */}
                  {Array.from({length: totalPages}, (_, i) => i+1)
                    .filter(n => n===1 || n===totalPages || Math.abs(n-page)<=1)
                    .reduce((acc, n, idx, arr) => {
                      if (idx > 0 && n - arr[idx-1] > 1) acc.push('…');
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) => (
                      n === '…'
                        ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
                        : <button key={n} onClick={() => setPage(n)}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                              page===n ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}>
                            {n}
                          </button>
                    ))
                  }
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition">
                    <ChevronRight size={14} className="text-slate-600"/>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {invoiceTarget && (
        <InvoiceListModal
          payment={invoiceTarget}
          allPayments={enriched}
          onClose={() => setInvoiceTarget(null)}
        />
      )}

      {/* Email Modal */}
      {emailTarget && (
        <EmailModal payment={emailTarget} onClose={() => setEmailTarget(null)} />
      )}

      {editTarget && (
        <EditPaymentModal
          payment={editTarget}
          onSave={fetchAll}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeletePaymentModal
          payment={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Payments;
