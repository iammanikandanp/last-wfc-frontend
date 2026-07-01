import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomBaseUrl, { PUBLIC_SERVER_URL } from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import {
  CreditCard, Plus, Search, X, Filter, Mail, CheckCircle,
  AlertCircle, Clock, ChevronLeft, ChevronRight, Download,
  Wallet, TrendingUp, Users, RefreshCw, Send, Check, Edit3, Trash2, Save,
  FileText, Loader, Ban, DollarSign, UserX, ShieldOff, Unlock
} from 'lucide-react';

const GYM_NAME = 'WFC – Wolverine Fitness Club';

// ── Script loader ─────────────────────────────────────────────────────────────
const loadScriptP = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});

// ── Invoice PDF generator — same structure as AddPayment invoice ───────────────
const generatePaymentPDF = async (p) => {
  await loadScriptP('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, pad = 15;
  const isPartly = p.paymentType === 'partly';

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
  const fmtAmt  = (n) => `Rs. ${(n || 0).toLocaleString('en-IN')}`;

  const sdObj = p.startDate ? new Date(p.startDate) : null;
  const edObj = p.endDate   ? new Date(p.endDate)   : null;
  const sdStr = fmtDate(p.startDate);
  const edStr = fmtDate(p.endDate);

  let durationBadge = '';
  let durationLabel = '-';
  if (sdObj && edObj) {
    const months = Math.round((edObj - sdObj) / (1000 * 60 * 60 * 24 * 30.44));
    durationBadge = `${months} MONTH${months !== 1 ? 'S' : ''}`;
    const periodMap = { 1: 'Monthly', 3: 'Quarterly', 6: 'Half-Yearly', 12: 'Yearly' };
    durationLabel = `${months} Month${months !== 1 ? 's' : ''} (${periodMap[months] || 'Membership'})`;
  }

  const C = {
    dark:    [17, 17, 17],
    darkCard:[28, 28, 28],
    gold:    [210, 168, 45],
    white:   [255, 255, 255],
    light:   [248, 249, 250],
    border:  [218, 218, 218],
    textDk:  [20, 20, 20],
    textGy:  [110, 110, 110],
    green:   [46, 160, 67],
    red:     [210, 38, 38],
  };

  // White page background
  doc.setFillColor(...C.white); doc.rect(0, 0, W, H, 'F');

  // ── DARK HEADER ──────────────────────────────────────────────────────────────
  doc.setFillColor(...C.dark); doc.rect(0, 0, W, 43, 'F');

  doc.setFontSize(19); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text('WOLVERINE FITNESS CLUB', W / 2, 16, { align: 'center' });

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.gold);
  doc.text('YOUR ULTIMATE FITNESS DESTINATION', W / 2, 24, { align: 'center' });

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.white);
  doc.text('GSTIN: 33BOAPH6375A1ZF', W / 2, 31, { align: 'center' });

  doc.setDrawColor(...C.gold); doc.setLineWidth(0.5);
  doc.line(pad + 28, 36, W - pad - 28, 36);

  doc.setDrawColor(...C.gold); doc.setLineWidth(1.2);
  doc.line(0, 43, W, 43);

  // ── INVOICE INFO ─────────────────────────────────────────────────────────────
  let y = 53;

  doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.textDk);
  doc.text('INVOICE', pad, y);
  y += 10;

  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textGy);
  doc.text('Invoice No.', pad, y);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.gold);
  doc.text(p.invoiceNo || '-', pad + 28, y);
  y += 8;

  doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textGy);
  doc.text('Issued On', pad, y);
  doc.setTextColor(...C.textDk);
  doc.text(fmtDate(p.createdAt || new Date()), pad + 28, y);
  y += 10;

  // Paid / Partial badge
  if (!isPartly) {
    doc.setFillColor(...C.green);
    doc.roundedRect(pad, y, 22, 8, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
    doc.text('PAID', pad + 11, y + 5.5, { align: 'center' });
  } else {
    doc.setFillColor(...C.red);
    doc.roundedRect(pad, y, 26, 8, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
    doc.text('PARTIAL', pad + 13, y + 5.5, { align: 'center' });
  }
  y += 16;

  // ── TWO COLUMN CARDS ─────────────────────────────────────────────────────────
  const colW = (W - pad * 2 - 5) / 2;
  const rightX = pad + colW + 5;
  const cardH = 52;

  // Left card — BILLED TO
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(pad, y, colW, cardH, 2, 2, 'F');
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.roundedRect(pad, y, colW, cardH, 2, 2, 'S');

  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.gold);
  doc.text('BILLED TO', pad + 5, y + 8);

  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.textDk);
  doc.text(p.memberName || '-', pad + 5, y + 18);

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textGy);
  if (p.memberPhone) doc.text(`- ${p.memberPhone}`, pad + 5, y + 27);
  doc.text('- Wolverine Fitness Club', pad + 5, y + 35);
  doc.text('  Member Portal', pad + 5, y + 42);

  // Right card — MEMBERSHIP PERIOD
  doc.setFillColor(...C.darkCard);
  doc.roundedRect(rightX, y, colW, cardH, 2, 2, 'F');

  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.gold);
  doc.text('MEMBERSHIP PERIOD', rightX + 5, y + 8);

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 170, 170);
  doc.text('Start Date', rightX + 5, y + 15);

  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text(sdStr, rightX + 5, y + 24);

  if (durationBadge) {
    const bdgW = 24; const bdgX = rightX + colW - 5 - bdgW;
    doc.setFillColor(...C.gold);
    doc.roundedRect(bdgX, y + 19, bdgW, 7, 2, 2, 'F');
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
    doc.text(durationBadge, bdgX + bdgW / 2, y + 24, { align: 'center' });
  }

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 170, 170);
  doc.text('End Date', rightX + 5, y + 33);

  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text(edStr, rightX + 5, y + 42);

  y += cardH + 10;

  // ── DESCRIPTION TABLE ─────────────────────────────────────────────────────────
  const tableW = W - pad * 2;
  const rowH = 10;

  doc.setFillColor(...C.dark); doc.rect(pad, y, tableW, 10, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.gold);
  doc.text('DESCRIPTION', pad + 5, y + 7);
  doc.text('DETAILS', W - pad - 5, y + 7, { align: 'right' });
  y += 10;

  const paymentMode = p.paymentMode
    ? p.paymentMode.charAt(0).toUpperCase() + p.paymentMode.slice(1)
    : '-';

  const tableRows = [
    ['Membership Package', `${p.package || '-'} Plan`],
    ['Payment Mode', paymentMode],
    ['Duration', durationLabel],
  ];

  tableRows.forEach(([label, value], i) => {
    doc.setFillColor(...(i % 2 === 0 ? C.white : C.light));
    doc.rect(pad, y, tableW, rowH, 'F');
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
    doc.line(pad, y + rowH, W - pad, y + rowH);

    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textGy);
    doc.text(label, pad + 5, y + 7);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.textDk);
    doc.text(value, W - pad - 5, y + 7, { align: 'right' });
    y += rowH;
  });

  y += 5;

  // ── TOTALS ────────────────────────────────────────────────────────────────────

  // Subtotal
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textGy);
  doc.text('Subtotal', pad + 5, y + 7);
  doc.setTextColor(...C.textDk);
  doc.text(fmtAmt(p.amount), W - pad - 5, y + 7, { align: 'right' });
  doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
  doc.line(pad, y + rowH, W - pad, y + rowH);
  y += rowH;

  // Discount
  if ((p.discount || 0) > 0) {
    doc.setFillColor(...C.light); doc.rect(pad, y, tableW, rowH, 'F');
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textGy);
    doc.text('Discount Applied', pad + 5, y + 7);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.red);
    doc.text(`- ${fmtAmt(p.discount)}`, W - pad - 5, y + 7, { align: 'right' });
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
    doc.line(pad, y + rowH, W - pad, y + rowH);
    y += rowH;
  }

  // Advance paid (partly)
  if (isPartly && (p.advanceAmount || 0) > 0) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textGy);
    doc.text('Advance Paid', pad + 5, y + 7);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.textDk);
    doc.text(fmtAmt(p.advanceAmount), W - pad - 5, y + 7, { align: 'right' });
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
    doc.line(pad, y + rowH, W - pad, y + rowH);
    y += rowH;
  }

  // TOTAL PAID / BALANCE DUE
  const totalLabel = isPartly ? 'BALANCE DUE' : 'TOTAL PAID';
  const totalValue = isPartly ? (p.balanceAmount || 0) : (p.finalAmount || p.amount || 0);

  doc.setFillColor(...C.dark); doc.rect(pad, y, tableW, 13, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.gold);
  doc.text(totalLabel, pad + 5, y + 9);
  doc.setFontSize(14); doc.setTextColor(...C.white);
  doc.text(fmtAmt(totalValue), W - pad - 5, y + 9.5, { align: 'right' });

  y += 24;

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.gold);
  doc.text('Thank you for choosing Wolverine Fitness Club!', W / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textGy);
  doc.text('Keep pushing your limits  *  Stay strong  *  Stay consistent', W / 2, y, { align: 'center' });
  y += 6;
  doc.text('For queries: contact@wolverinefitnessclub.com  |  +91 97869 69711', W / 2, y, { align: 'center' });

  return doc;
};

// ── Invoice List Modal — opens all invoices for a member ──────────────────────
const InvoiceListModal = ({ payment, allPayments, onClose }) => {
  const memberPayments = allPayments
    .filter(p => String(p.registrationId) === String(payment.registrationId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const [downloading, setDownloading] = useState(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);

  const downloadSingle = async (p) => {
    if (downloading.has(p._id)) return;
    const safeName = `WFC-Invoice-${p.invoiceNo}-${(p.memberName||'member').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'-')}.pdf`;
    setDownloading(prev => new Set([...prev, p._id]));
    let usedCloud = false;
    try {
      if (p.pdfUrl) {
        const res = await fetch(p.pdfUrl);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('pdf')) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = safeName;
          a.click();
          URL.revokeObjectURL(blobUrl);
          usedCloud = true;
        }
      }
      if (!usedCloud) {
        const doc = await generatePaymentPDF(p);
        doc.save(safeName);
      }
    } catch {
      try {
        const doc = await generatePaymentPDF(p);
        doc.save(safeName);
      } catch(e2) {
        alert('Could not generate PDF: ' + e2.message);
      }
    } finally {
      setDownloading(prev => { const s = new Set(prev); s.delete(p._id); return s; });
    }
  };

  const downloadAll = async () => {
    setDownloadingAll(true);
    for (const p of memberPayments) {
      try {
        const safeName = `WFC-Invoice-${p.invoiceNo}-${(p.memberName||'member').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'-')}.pdf`;
        let usedCloud = false;
        if (p.pdfUrl) {
          try {
            const res = await fetch(p.pdfUrl);
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('pdf')) {
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = safeName;
              a.click();
              URL.revokeObjectURL(blobUrl);
              usedCloud = true;
            }
          } catch { /* fall through to generate */ }
        }
        if (!usedCloud) {
          const doc = await generatePaymentPDF(p);
          doc.save(safeName);
        }
        await new Promise(r => setTimeout(r, 400));
      } catch(e) { console.warn('Skip', p.invoiceNo, e.message); }
    }
    setDownloadingAll(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>
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
                {downloadingAll ? <Loader size={12} className="animate-spin"/> : <Download size={12}/>}
                Download All
              </button>
            )}
            <button onClick={onClose}><X size={16} className="opacity-60 hover:opacity-100"/></button>
          </div>
        </div>
        <div className="overflow-y-auto divide-y divide-slate-50">
          {memberPayments.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm">No invoices found</p>
          ) : memberPayments.map((p) => {
            const isPending = p.balanceAmount > 0;
            const isLoading = downloading.has(p._id);
            return (
              <div key={p._id} className={`px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition ${isPending ? 'bg-amber-50/40' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPending ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <FileText size={16} className={isPending ? 'text-amber-600' : 'text-emerald-600'}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-800 font-mono">{p.invoiceNo}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isPending ? 'Pending' : 'Paid'}
                    </span>
                    {p.pdfUrl && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Cloud</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {p.package} · {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-slate-800">₹{(p.finalAmount||p.amount||0).toLocaleString('en-IN')}</p>
                  {isPending && <p className="text-[10px] text-red-500 font-semibold">Due ₹{p.balanceAmount.toLocaleString('en-IN')}</p>}
                </div>
                <button onClick={() => downloadSingle(p)} disabled={isLoading}
                  title={p.pdfUrl ? 'Open invoice PDF' : 'Generate & download invoice'}
                  className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition disabled:opacity-50 flex-shrink-0">
                  {isLoading ? <Loader size={13} className="animate-spin"/> : <Download size={13}/>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {memberPayments.filter(p => p.pdfUrl).length} cloud-hosted · {memberPayments.filter(p => !p.pdfUrl).length} will be generated
          </p>
          <button onClick={onClose} className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-white transition">Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Email Reminder Modal ──────────────────────────────────────────────────────
const EmailModal = ({ payment, onClose }) => {
  const [status, setStatus] = useState('idle');
  const [errMsg, setErrMsg] = useState('');
  const [pdfFound, setPdfFound] = useState(null);
  const noEmail = !payment.memberEmail;

  const handleSend = async () => {
    if (noEmail) return;
    setStatus('sending'); setErrMsg('');
    try {
      const res = await CustomBaseUrl.post(`/send-email`, {
        to: payment.memberEmail, memberName: payment.memberName, invoiceNo: payment.invoiceNo,
        amount: payment.amount, finalAmount: payment.finalAmount, balanceAmount: payment.balanceAmount || 0,
        packageName: payment.package, startDate: payment.startDate, endDate: payment.endDate,
        paymentMode: payment.paymentMode, pdfUrl: payment.pdfUrl || '', isReminder: true,
      });
      if (res.data.success) { setPdfFound(res.data.pdfIncluded); setStatus('success'); }
      else { setErrMsg(res.data.message || 'Failed to send email'); setStatus('error'); }
    } catch (e) { setErrMsg(e.response?.data?.message || e.message || 'Network error'); setStatus('error'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white"><Mail size={18}/><p className="font-bold text-sm">Send Balance Reminder</p></div>
          <button onClick={onClose}><X size={16} className="text-white/70 hover:text-white"/></button>
        </div>
        {status === 'success' && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><Check size={24} className="text-green-600"/></div>
            <p className="font-bold text-slate-800 mb-1">Reminder Sent!</p>
            <p className="text-xs text-slate-500 mb-1">Email delivered to <strong>{payment.memberEmail}</strong></p>
            {pdfFound !== null && (
              <p className={`text-xs mb-4 font-medium ${pdfFound ? 'text-emerald-600' : 'text-amber-600'}`}>
                {pdfFound ? '📄 Invoice PDF link included in email' : '⚠️ No PDF found — email sent without invoice link'}
              </p>
            )}
            <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition">Done</button>
          </div>
        )}
        {status !== 'success' && (
          <div className="p-5">
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-500 uppercase tracking-wide text-[10px] mb-2">Email Preview</p>
              <p><strong>To:</strong> {payment.memberEmail || <span className="text-red-500">No email on file</span>}</p>
              <p className="mt-1"><strong>Subject:</strong> Balance Reminder – {GYM_NAME}</p>
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-slate-500">
                <p>Dear <strong className="text-slate-700">{payment.memberName}</strong>,</p>
                <p>Pending balance of <strong className="text-red-600">₹{(payment.balanceAmount||0).toLocaleString('en-IN')}</strong> on your membership.</p>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200 my-2 space-y-0.5">
                  <p>Invoice: <strong>{payment.invoiceNo}</strong></p>
                  <p>Package: <strong>{payment.package}</strong></p>
                  <p>Due: <strong className="text-red-600">₹{(payment.balanceAmount||0).toLocaleString('en-IN')}</strong></p>
                </div>
              </div>
            </div>
            {noEmail && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                <AlertCircle size={13} className="text-amber-600 flex-shrink-0"/>
                <p className="text-xs text-amber-700">No email address on file.</p>
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
                <p className="text-xs text-red-700 font-medium">{errMsg}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleSend} disabled={noEmail || status === 'sending'}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40">
                {status === 'sending' ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/> Sending…</> : <><Send size={14}/> Send Reminder Now</>}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes su{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
};

// ── WhatsApp icon ─────────────────────────────────────────────────────────────
const WhatsAppIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// shareInvoiceAsImage — copies invoice image to clipboard + opens member's WhatsApp chat
const shareInvoiceAsImage = async (p, invoiceRef, setSharingWa) => {
  const phone = (p.memberPhone || '').replace(/\D/g, '');
  if (!phone) { alert('No phone number for this member.'); return; }

  // Open the member's WhatsApp chat immediately (must be in user-gesture context)
  window.open(`https://wa.me/91${phone}`, '_blank');

  setSharingWa(true);
  try {
    await loadScriptP('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await window.html2canvas(invoiceRef.current, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
    });

    canvas.toBlob(async (blob) => {
      let copied = false;
      // Try copying to clipboard so user can paste directly in WhatsApp
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        copied = true;
      } catch {
        // Clipboard write not supported — fall back to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WFC-Invoice-${p.invoiceNo || 'INV'}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }

      if (copied) {
        // Show overlay prompt instead of alert so it doesn't block the WhatsApp tab
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#25D366;color:#fff;padding:14px 22px;border-radius:14px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.2);text-align:center;max-width:320px';
        div.innerHTML = '✅ Invoice image copied!<br><span style="font-weight:400;font-size:12px">Go to WhatsApp → press Ctrl+V (or long-press → Paste) → Send</span>';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
      }
    }, 'image/png');
  } catch (e) {
    console.error('Image capture error:', e);
    alert('Could not capture invoice image.');
  } finally {
    setSharingWa(false);
  }
};

// ── Stable field component ─────────────────────────────────────────────────────
const PaymentField = ({ label, name, type = 'text', options, form, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
    {options ? (
      <select name={name} value={form[name]} onChange={onChange}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
        {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
      </select>
    ) : (
      <input name={name} type={type} value={form[name]} onChange={onChange}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
    )}
  </div>
);

// ── Edit Payment Modal ─────────────────────────────────────────────────────────
const EditPaymentModal = ({ payment, onSave, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [form, setForm] = useState({
    paymentMode: payment.paymentMode || 'cash', paymentType: payment.paymentType || 'full',
    amount: payment.amount || 0, finalAmount: payment.finalAmount || 0,
    discount: payment.discount || 0, advanceAmount: payment.advanceAmount || 0,
    balanceAmount: payment.balanceAmount || 0,
    startDate: payment.startDate?.split('T')[0] || '', endDate: payment.endDate?.split('T')[0] || '',
    package: payment.package || '',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => {
      const upd = { ...f, [name]: value };
      if (name === 'advanceAmount') upd.balanceAmount = Math.max(0, (upd.finalAmount || 0) - parseFloat(value || 0));
      if (name === 'finalAmount') upd.balanceAmount = Math.max(0, parseFloat(value||0) - (upd.advanceAmount||0));
      if (name === 'paymentType' && value === 'full') { upd.advanceAmount = upd.finalAmount; upd.balanceAmount = 0; }
      return upd;
    });
  };

  const handleSave = async () => {
    setSaving(true); setErrMsg('');
    try { await CustomBaseUrl.put(`/reg-payments/${payment._id}`, form); onSave(); onClose(); }
    catch(e) { setErrMsg(e.response?.data?.message || e.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between text-white">
          <div><p className="font-bold text-sm">Edit Payment</p><p className="text-xs opacity-60">{payment.memberName} · {payment.invoiceNo}</p></div>
          <button onClick={onClose}><X size={16} className="opacity-60 hover:opacity-100"/></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PaymentField label="Payment Mode" name="paymentMode" form={form} onChange={handleChange} options={[{val:'cash',label:'Cash'},{val:'upi',label:'UPI'},{val:'card',label:'Card'}]}/>
            <PaymentField label="Payment Type" name="paymentType" form={form} onChange={handleChange} options={[{val:'full',label:'Full'},{val:'partly',label:'Partly'}]}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PaymentField label="Total Amount (₹)" name="amount" type="number" form={form} onChange={handleChange}/>
            <PaymentField label="Discount (₹)" name="discount" type="number" form={form} onChange={handleChange}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PaymentField label="Final Amount (₹)" name="finalAmount" type="number" form={form} onChange={handleChange}/>
            <PaymentField label="Advance Paid (₹)" name="advanceAmount" type="number" form={form} onChange={handleChange}/>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Balance Due</span>
            <span className={`text-xl font-black ${form.balanceAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>₹{Number(form.balanceAmount||0).toLocaleString('en-IN')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PaymentField label="Start Date" name="startDate" type="date" form={form} onChange={handleChange}/>
            <PaymentField label="End Date" name="endDate" type="date" form={form} onChange={handleChange}/>
          </div>
          <PaymentField label="Package" name="package" form={form} onChange={handleChange}/>
          {errMsg && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">{errMsg}</div>}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-40">
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
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600"/></div>
      <h3 className="font-bold text-slate-900 text-lg mb-1">Delete Payment?</h3>
      <p className="text-slate-500 text-sm mb-1"><strong>{payment.memberName}</strong> · {payment.invoiceNo}</p>
      <p className="text-slate-400 text-xs mb-5">₹{(payment.finalAmount||payment.amount||0).toLocaleString('en-IN')} · This cannot be undone.</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

// ── Write-Off Confirm Modal ───────────────────────────────────────────────────
const WriteOffModal = ({ payment, onConfirm, onClose }) => {
  const [saving, setSaving] = useState(false);
  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>
        <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4"><Ban size={24} className="text-orange-600"/></div>
        <h3 className="font-bold text-slate-900 text-lg mb-1">Write Off Balance?</h3>
        <p className="text-slate-500 text-sm mb-1"><strong>{payment.memberName}</strong> · {payment.invoiceNo}</p>
        <p className="text-slate-400 text-xs mb-2">Pending balance: <strong className="text-red-600">₹{(payment.balanceAmount||0).toLocaleString('en-IN')}</strong></p>
        <p className="text-slate-400 text-xs mb-5 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
          This marks the balance as <strong>never to be collected</strong>. It will be removed from all pending totals and reports. The member can still pay later using the "Pay Now" button.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition disabled:opacity-40">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Ban size={14}/>}
            Write Off
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Pay Now Modal (collect written-off balance) ───────────────────────────────
const PayNowModal = ({ payment, onSave, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [mode, setMode] = useState('cash');
  const handlePay = async () => {
    setSaving(true); setErrMsg('');
    try {
      await CustomBaseUrl.put(`/reg-payments/${payment._id}`, {
        paymentMode: mode,
        paymentType: 'full',
        advanceAmount: payment.finalAmount,
        balanceAmount: 0,
        writtenOff: false,
        writtenOffAt: null,
      });
      onSave();
      onClose();
    } catch(e) {
      setErrMsg(e.response?.data?.message || e.message || 'Update failed');
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()} style={{animation:'su .2s ease'}}>
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2"><DollarSign size={18}/><p className="font-bold text-sm">Collect Payment</p></div>
          <button onClick={onClose}><X size={16} className="opacity-70 hover:opacity-100"/></button>
        </div>
        <div className="p-5">
          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-center">
            <p className="text-xs text-slate-500 mb-1">{payment.memberName} · {payment.invoiceNo}</p>
            <p className="text-2xl font-black text-emerald-600">₹{(payment.balanceAmount||0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-slate-400 mt-0.5">Balance to collect</p>
          </div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Mode</label>
          <div className="flex gap-2 mb-4">
            {['cash','upi','card'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition border ${mode===m ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {m}
              </button>
            ))}
          </div>
          {errMsg && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 text-xs text-red-700">{errMsg}</div>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handlePay} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-40">
              {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={14}/>}
              Collect ₹{(payment.balanceAmount||0).toLocaleString('en-IN')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Payments Page ────────────────────────────────────────────────────────
const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [emailTarget, setEmailTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null);
  const [sharingWa, setSharingWa] = useState(false);
  const [waPayment, setWaPayment] = useState(null);
  const [writeOffTarget, setWriteOffTarget] = useState(null);
  const [payNowTarget, setPayNowTarget] = useState(null);
  const [blockList, setBlockList] = useState([]);
  const [dragOverActive, setDragOverActive] = useState(false);
  const invoiceShareRef = useRef(null);
  const PER_PAGE = 20;

  useEffect(() => { fetchAll(); fetchBlockList(); }, []);

  const fetchBlockList = async () => {
    try {
      const res = await CustomBaseUrl.get('/block-list');
      setBlockList(res.data?.data || []);
    } catch (e) { console.warn('Could not load block list:', e.message); }
  };

  const isBlocked = (p) => blockList.some(b => b.memberPhone === p.memberPhone);

  const handleDropPayment = async (p) => {
    if (isBlocked(p)) return;
    try {
      const res = await CustomBaseUrl.post('/block-list', {
        registrationId: p.registrationId,
        memberName: p.memberName,
        memberPhone: p.memberPhone,
      });
      setBlockList(prev => [res.data.data, ...prev]);
    } catch (e) { alert('Could not block member: ' + (e.response?.data?.message || e.message)); }
  };

  const handleUnblock = async (b) => {
    try {
      await CustomBaseUrl.delete(`/block-list/${b._id}`);
      setBlockList(prev => prev.filter(x => x._id !== b._id));
    } catch (e) { alert('Unblock failed: ' + (e.response?.data?.message || e.message)); }
  };

  const handleShareAsImage = async (p) => {
    setWaPayment(p);
    await new Promise(r => setTimeout(r, 80)); // let hidden div render
    await shareInvoiceAsImage(p, invoiceShareRef, setSharingWa);
    setWaPayment(null);
  };

  const fetchAll = async () => {
    setLoading(true); setFetchError('');
    try {
      const [pRes, mRes] = await Promise.allSettled([
        CustomBaseUrl.get(`/reg-payments`),
        CustomBaseUrl.get(`/fetch`),
      ]);
      if (pRes.status === 'fulfilled') {
        const data = pRes.value.data;
        const list = data?.payments || data?.data || [];
        setPayments(list);
      } else {
        const errMsg = pRes.reason?.response?.data?.message || pRes.reason?.message || 'API error';
        setFetchError(`Could not load payments: ${errMsg}`);
      }
      if (mRes.status === 'fulfilled') setMembers(mRes.value.data?.data || []);
    } catch(e) { setFetchError(e.message); }
    finally { setLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await CustomBaseUrl.delete(`/reg-payments/${deleteTarget._id}`);
      setPayments(prev => prev.filter(p => p._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch(e) { alert('Delete failed: ' + (e.response?.data?.message || e.message)); }
  };

  const handleWriteOff = async () => {
    if (!writeOffTarget) return;
    try {
      await CustomBaseUrl.put(`/reg-payments/${writeOffTarget._id}`, {
        writtenOff: true,
        writtenOffAt: new Date().toISOString(),
      });
      await fetchAll();
      setWriteOffTarget(null);
    } catch(e) { alert('Write-off failed: ' + (e.response?.data?.message || e.message)); }
  };

  const enriched = payments.map(p => {
    const member = members.find(m => String(m._id) === String(p.registrationId));
    return { ...p, memberEmail: member?.emails || p.memberEmail || '' };
  });

  const renewalCount   = enriched.filter(p => p.isRenewal).length;
  const writtenOffCount = enriched.filter(p => p.writtenOff).length;

  const filtered = enriched
    .filter(p => {
      if (filter === 'full')      return !p.balanceAmount || p.balanceAmount <= 0 || p.writtenOff;
      if (filter === 'pending')   return !p.writtenOff && p.balanceAmount > 0;
      if (filter === 'writtenoff') return !!p.writtenOff;
      if (filter === 'renewal')   return !!p.isRenewal;
      if (filter === 'blocked')   return isBlocked(p);
      return true;
    })
    .filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return p.memberName?.toLowerCase().includes(q) || p.memberPhone?.includes(q) ||
             p.invoiceNo?.toLowerCase().includes(q) || p.package?.toLowerCase().includes(q);
    });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => setPage(1), [filter, search]);

  const totalRevenue = payments.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0);
  // Written-off balances are excluded from pending totals everywhere
  const totalPending = payments.reduce((s, p) => s + (p.writtenOff ? 0 : (p.balanceAmount || 0)), 0);
  const pendingCount = payments.filter(p => !p.writtenOff && p.balanceAmount > 0).length;
  const fullCount    = payments.filter(p => !p.balanceAmount || p.balanceAmount <= 0 || p.writtenOff).length;
  const blockedCount = payments.filter(p => isBlocked(p)).length;

  const modeColor = (m) => ({
    cash: 'bg-emerald-100 text-emerald-700', upi: 'bg-violet-100 text-violet-700',
    card: 'bg-blue-100 text-blue-700', online: 'bg-indigo-100 text-indigo-700',
  }[(m||'').toLowerCase()] || 'bg-slate-100 text-slate-600');

  const FILTERS = [
    { key:'all',        label:`All (${payments.length})`,           icon: CreditCard },
    { key:'full',       label:`Full Paid (${fullCount})`,            icon: CheckCircle },
    { key:'pending',    label:`Pending (${pendingCount})`,           icon: AlertCircle },
    { key:'writtenoff', label:`Written Off (${writtenOffCount})`,    icon: Ban },
    { key:'renewal',    label:`Renewals (${renewalCount})`,          icon: RefreshCw },
    { key:'blocked',    label:`Block List (${blockedCount})`,        icon: ShieldOff },
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { label:'Total Revenue',   val:`₹${totalRevenue.toLocaleString('en-IN')}`,                     icon:TrendingUp,  c:'text-emerald-600 bg-emerald-50' },
            { label:'Net Income',      val:`₹${(totalRevenue - totalPending).toLocaleString('en-IN')}`,     icon:Wallet,      c:'text-violet-600 bg-violet-50' },
            { label:'Total Pending',   val:`₹${totalPending.toLocaleString('en-IN')}`,                     icon:AlertCircle, c:'text-red-600 bg-red-50' },
            { label:'Full Payments',   val:fullCount,                                                        icon:CheckCircle, c:'text-blue-600 bg-blue-50' },
            { label:'Pending Members', val:pendingCount,                                                     icon:Clock,       c:'text-amber-600 bg-amber-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.c}`}>{React.createElement(s.icon, {size: 16})}</div>
              <div><p className="text-xs text-slate-400">{s.label}</p><p className="text-base font-black text-slate-900">{s.val}</p></div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex-wrap">
            {FILTERS.map((f) => {
              const isBlockTab = f.key === 'blocked';
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  onDragOver={isBlockTab ? (e) => { e.preventDefault(); setDragOverActive(true); } : undefined}
                  onDragLeave={isBlockTab ? () => setDragOverActive(false) : undefined}
                  onDrop={isBlockTab ? (e) => {
                    e.preventDefault();
                    setDragOverActive(false);
                    const data = e.dataTransfer.getData('application/json');
                    if (!data) return;
                    handleDropPayment(JSON.parse(data));
                    setFilter('blocked');
                  } : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter===f.key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'} ${isBlockTab && dragOverActive ? 'ring-2 ring-red-400 bg-red-50 text-red-600' : ''}`}>
                  {React.createElement(f.icon, {size: 11})} {f.label}
                </button>
              );
            })}
          </div>
          <div className="relative ml-auto">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name / phone / invoice…"
              className="pl-7 pr-7 py-1.5 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-300 w-48 shadow-sm"/>
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={11} className="text-slate-400"/></button>}
          </div>
        </div>

        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0"/>
            <p className="text-sm text-red-700 font-medium">{fetchError}</p>
            <button onClick={fetchAll} className="ml-auto text-xs text-red-600 underline hover:text-red-800">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <RefreshCw size={24} className="animate-spin text-slate-300 mx-auto mb-2"/>
            <p className="text-xs text-slate-400">Loading payments…</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">
                {{ all: 'All Payments', full: 'Full Payments', pending: 'Pending Payments', writtenoff: 'Written-Off Payments', renewal: 'Renewal Payments', blocked: 'Blocked Members' }[filter]} · {filtered.length} records
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
                    const isPending   = !p.writtenOff && p.balanceAmount > 0;
                    const isWrittenOff = !!p.writtenOff;
                    const blocked = isBlocked(p);
                    return (
                      <tr key={p._id} draggable
                        onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({
                          registrationId: p.registrationId, memberName: p.memberName, memberPhone: p.memberPhone,
                        }))}
                        title="Drag to Block List to block this member"
                        className={`hover:bg-slate-50 transition cursor-grab active:cursor-grabbing ${isWrittenOff ? 'bg-slate-50/60 opacity-70' : isPending ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[10px]">{(page-1)*PER_PAGE + i + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-slate-800 whitespace-nowrap">{p.memberName || '—'}</p>
                            {blocked && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600"><Ban size={9}/> Blocked</span>}
                          </div>
                          <p className="text-[10px] text-slate-400">{p.memberPhone}</p>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{p.package || '—'}</td>
                        <td className="px-3 py-2.5 font-bold text-emerald-600 whitespace-nowrap">₹{(p.finalAmount || p.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5">
                          {isWrittenOff
                            ? <span className="flex items-center gap-1 text-slate-400 font-semibold whitespace-nowrap"><Ban size={11}/> Written Off</span>
                            : isPending
                              ? <span className="font-bold text-red-600 whitespace-nowrap">₹{p.balanceAmount.toLocaleString('en-IN')}</span>
                              : <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle size={11}/> Paid</span>}
                        </td>
                        <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${modeColor(p.paymentMode)}`}>{p.paymentMode || '—'}</span></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.paymentType === 'partly' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{p.paymentType === 'partly' ? 'Part' : 'Full'}</span>
                            {p.isRenewal && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">🔄 Renew</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setInvoiceTarget(p)} title="View & download invoices" className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"><FileText size={13}/></button>
                            <button onClick={() => handleShareAsImage(p)} disabled={sharingWa} title="Send invoice image via WhatsApp" className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition disabled:opacity-40">{sharingWa ? <Loader size={13} className="animate-spin"/> : <WhatsAppIcon size={13}/>}</button>
                            <button onClick={() => setEditTarget(p)} title="Edit payment" className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition"><Edit3 size={13}/></button>
                            <button onClick={() => setDeleteTarget(p)} title="Delete payment" className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition"><Trash2 size={13}/></button>
                            {isPending && (
                              <>
                                <button onClick={() => setEmailTarget(p)} title="Send reminder email" className="p-1.5 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition"><Mail size={13}/></button>
                                <button onClick={() => setWriteOffTarget(p)} title="Write off — mark balance as never to be collected" className="p-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-700 transition"><Ban size={13}/></button>
                              </>
                            )}
                            {isWrittenOff && (
                              <button onClick={() => setPayNowTarget(p)} title="Member is back — collect the balance now" className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition"><DollarSign size={13}/></button>
                            )}
                            {blocked ? (
                              <button onClick={() => handleUnblock(blockList.find(b => b.memberPhone === p.memberPhone))} title="Unblock member" className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition"><Unlock size={13}/></button>
                            ) : (
                              <button onClick={() => handleDropPayment(p)} title="Move to Block List" className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition"><ShieldOff size={13}/></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
                <p className="text-xs text-slate-400">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition"><ChevronLeft size={14} className="text-slate-600"/></button>
                  {Array.from({length: totalPages}, (_, i) => i+1)
                    .filter(n => n===1 || n===totalPages || Math.abs(n-page)<=1)
                    .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx-1] > 1) acc.push('…'); acc.push(n); return acc; }, [])
                    .map((n, i) => (
                      n === '…'
                        ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
                        : <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${page===n ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{n}</button>
                    ))
                  }
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition"><ChevronRight size={14} className="text-slate-600"/></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {invoiceTarget && <InvoiceListModal payment={invoiceTarget} allPayments={enriched} onClose={() => setInvoiceTarget(null)}/>}
      {emailTarget && <EmailModal payment={emailTarget} onClose={() => setEmailTarget(null)}/>}
      {editTarget && <EditPaymentModal payment={editTarget} onSave={fetchAll} onClose={() => setEditTarget(null)}/>}
      {deleteTarget && <DeletePaymentModal payment={deleteTarget} onConfirm={handleDeleteConfirm} onClose={() => setDeleteTarget(null)}/>}
      {writeOffTarget && <WriteOffModal payment={writeOffTarget} onConfirm={handleWriteOff} onClose={() => setWriteOffTarget(null)}/>}
      {payNowTarget && <PayNowModal payment={payNowTarget} onSave={fetchAll} onClose={() => setPayNowTarget(null)}/>}

      {/* Hidden invoice template captured by html2canvas for WhatsApp image sharing */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        {waPayment && (
          <div ref={invoiceShareRef} style={{ width: '680px', background: '#fff', fontFamily: 'Arial, sans-serif', color: '#1e293b', padding: '36px 40px' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#7f1d1d)', color: '#fff', padding: '24px 28px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0 }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 'bold' }}>WFC – Wolverine Fitness Club</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Excellence in Fitness | Coimbatore, Tamil Nadu</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '26px', fontWeight: '900', color: '#fca5a5', letterSpacing: '2px' }}>INVOICE</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', fontFamily: 'monospace' }}># {waPayment.invoiceNo}</div>
              </div>
            </div>
            {/* Status bar */}
            <div style={{ background: waPayment.balanceAmount > 0 ? '#fef9c3' : '#dcfce7', color: waPayment.balanceAmount > 0 ? '#92400e' : '#15803d', padding: '8px 28px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>
              {waPayment.balanceAmount > 0 ? `⏳ ADVANCE PAID — BALANCE DUE ₹${(waPayment.balanceAmount||0).toLocaleString('en-IN')}` : '✅ FULLY PAID'}
            </div>
            {/* Body */}
            <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '24px 28px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Bill To</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{waPayment.memberName}</div>
                {waPayment.memberPhone && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>📞 {waPayment.memberPhone}</div>}
              </div>
              {/* Info grid */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Payment Info</div>
                  {[['Invoice No', waPayment.invoiceNo], ['Date', waPayment.createdAt ? new Date(waPayment.createdAt).toLocaleDateString('en-IN') : '—'], ['Pay Mode', (waPayment.paymentMode||'').toUpperCase()], ['Pay Type', waPayment.paymentType === 'partly' ? 'Advance' : 'Full']].map(([k,v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', padding: '3px 0' }}><span>{k}</span><span style={{ fontWeight: '600', color: '#1e293b' }}>{v}</span></div>
                  ))}
                </div>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Membership Period</div>
                  {[['Package', waPayment.package], ['Start', waPayment.startDate ? new Date(waPayment.startDate).toLocaleDateString('en-IN') : '—'], ['End', waPayment.endDate ? new Date(waPayment.endDate).toLocaleDateString('en-IN') : '—']].map(([k,v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', padding: '3px 0' }}><span>{k}</span><span style={{ fontWeight: '600', color: '#1e293b' }}>{v}</span></div>
                  ))}
                </div>
              </div>
              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    {['Description','Qty','Unit Price','Total'].map((h,i) => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: '#fff', textAlign: i===0?'left':'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#f8fafc' }}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700' }}>{waPayment.package} Membership</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>{waPayment.startDate ? new Date(waPayment.startDate).toLocaleDateString('en-IN') : '—'} – {waPayment.endDate ? new Date(waPayment.endDate).toLocaleDateString('en-IN') : '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>1</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>₹{(waPayment.amount||0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', fontWeight: '700', borderBottom: '1px solid #e2e8f0' }}>₹{(waPayment.amount||0).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '260px' }}>
                  {(waPayment.discount||0) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}><span>Discount</span><span style={{ color: '#dc2626' }}>– ₹{(waPayment.discount||0).toLocaleString('en-IN')}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', borderRadius: '8px', padding: '12px 14px', marginTop: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Total Payable</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#fca5a5' }}>₹{(waPayment.finalAmount||waPayment.amount||0).toLocaleString('en-IN')}</span>
                  </div>
                  {waPayment.paymentType === 'partly' && <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#dcfce7', borderRadius: '8px', padding: '8px 14px', marginTop: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d' }}>⚡ Advance Paid</span>
                      <span style={{ fontSize: '14px', fontWeight: '900', color: '#15803d' }}>₹{(waPayment.advanceAmount||0).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 14px', marginTop: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>⏳ Balance Due</span>
                      <span style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626' }}>₹{(waPayment.balanceAmount||0).toLocaleString('en-IN')}</span>
                    </div>
                  </>}
                </div>
              </div>
              {/* Footer */}
              <div style={{ borderTop: '3px solid #dc2626', marginTop: '24px', paddingTop: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Thank you for your business!</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>• For queries: support@wolverinefitnessclub.com</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>• Computer-generated invoice — no physical signature required.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;