import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import Navbar from '../components/Navbar';
import {
  Search, X, ChevronDown, Calendar, CreditCard, Smartphone,
  Banknote, Tag, Check, FileText, MessageCircle, Download,
  ArrowLeft, User, Clock, Zap, Star, Gift, Plus, Loader, Mail
} from 'lucide-react';

// ─── Preset packages ────────────────────────────────────────────────────────
const PRESET_PACKAGES = [
  { id: 'basic', label: 'Basic', price: 1000, months: 1, color: 'bg-slate-100 border-slate-300 text-slate-700', accent: 'bg-slate-600', icon: Star },
  { id: 'standard', label: 'Standard', price: 2500, months: 3, color: 'bg-blue-50 border-blue-300 text-blue-700', accent: 'bg-blue-600', icon: Zap },
  { id: 'premium', label: 'Premium', price: 4500, months: 6, color: 'bg-amber-50 border-amber-300 text-amber-700', accent: 'bg-amber-500', icon: Star },
  { id: 'offer', label: 'Offer', price: 7500, months: 12, color: 'bg-red-50 border-red-300 text-red-700', accent: 'bg-red-600', icon: Gift },
  { id: 'custom', label: 'Custom', price: 0, months: 0, color: 'bg-violet-50 border-violet-300 text-violet-700', accent: 'bg-violet-600', icon: Plus },
];

// ─── UPI QR ─────────────────────────────────────────────────────────────────
// GPay/PhonePe require: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR
// The data passed to QR must NOT be double-encoded — encode it once cleanly
const UpiQR = ({ amount, upiId, name }) => {
  // Build UPI deep link — spaces in name replaced with %20, no extra encoding
  const pa = upiId.trim();
  const pn = name.replace(/\s+/g, '%20');
  const am = parseFloat(amount).toFixed(2); // GPay needs 2 decimal places
  const upiString = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=WFC%20Gym%20Payment`;

  // Pass the raw UPI string directly to QR API — do NOT encodeURIComponent here
  // because the QR API will handle encoding internally
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(upiString)}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border-2 border-violet-200 shadow-md w-full max-w-xs mx-auto">
      {/* QR Image */}
      <div className="bg-white p-2 rounded-xl border border-slate-100">
        <img
          src={qrUrl}
          alt="UPI QR Code"
          className="w-44 h-44 rounded-lg"
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* UPI details */}
      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">{name}</p>
        <p className="text-xs text-violet-600 font-mono mt-0.5">{upiId}</p>
      </div>

      {/* Amount badge */}
      <div className="bg-violet-600 text-white px-5 py-1.5 rounded-full text-sm font-black">
        ₹{parseFloat(amount).toLocaleString('en-IN')}
      </div>

      {/* Instructions */}
      <div className="text-center space-y-0.5">
        <p className="text-xs text-slate-500 font-medium">Scan with GPay · PhonePe · Paytm</p>
        <p className="text-[10px] text-slate-400">Amount is pre-filled · Confirm in your app</p>
      </div>

      {/* Debug: show raw UPI string so you can verify */}
      <details className="w-full">
        <summary className="text-[10px] text-slate-300 cursor-pointer text-center">View UPI link</summary>
        <p className="text-[9px] text-slate-400 break-all mt-1 bg-slate-50 p-2 rounded-lg font-mono">{upiString}</p>
      </details>
    </div>
  );
};

// ─── PDF Generator using jsPDF + html2canvas ──────────────────────────────
const generateInvoicePDF = async (invoiceData) => {
  const { member, pkg, amount, discount, finalAmount, paymentMethod, startDate, endDate, invoiceNo } = invoiceData;

  // Dynamically load jsPDF and html2canvas from CDN
  const loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });

  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210; // A4 width mm
  const pad = 15;

  // ── Header background ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, W, 45, 'F');

  // ── Red accent bar ──
  doc.setFillColor(220, 38, 38); // red-600
  doc.rect(0, 42, W, 4, 'F');

  // ── Gym name ──
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('WFC - Wolverine Fitness Club', W / 2, 18, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Your Ultimate Fitness Destination', W / 2, 26, { align: 'center' });

  // ── Invoice badge ──
  doc.setFillColor(255, 255, 255, 0.1);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(W/2 - 28, 30, 56, 9, 2, 2, 'S');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.text(invoiceNo, W / 2, 35.5, { align: 'center' });

  // ── PAID stamp ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94); // green
  doc.setGState && doc.setGState(new doc.GState({ opacity: 0.15 }));
  doc.text('PAID', W - pad - 5, 38, { align: 'right', angle: -15 });
  doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));

  let y = 58;

  // ── Member info section ──
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(pad, y, W - pad * 2, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(pad, y, W - pad * 2, 28, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('BILLED TO', pad + 5, y + 7);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(member.name || '—', pad + 5, y + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`📞 ${member.phone || '—'}   ✉ ${member.emails || '—'}`, pad + 5, y + 21);

  // ── Issue date on right ──
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('ISSUED ON', W - pad - 35, y + 7);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString('en-IN'), W - pad - 35, y + 14);

  y += 36;

  // ── Details table header ──
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(pad, y, W - pad * 2, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const cols = [pad + 5, 90, W - pad - 5];
  doc.text('DESCRIPTION', cols[0], y + 6);
  doc.text('DETAILS', cols[1], y + 6);

  y += 13;

  // ── Table rows ──
  const tableRows = [
    ['Package / Plan', pkg || '—'],
    ['Payment Mode', (paymentMethod || '—').toUpperCase()],
    ['Membership Start', new Date(startDate).toLocaleDateString('en-IN')],
    ['Membership End', new Date(endDate).toLocaleDateString('en-IN')],
  ];

  tableRows.forEach((row, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.rect(pad, y - 4, W - pad * 2, 9, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(pad, y + 5, W - pad, y + 5);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(row[0], cols[0], y + 1.5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], cols[1], y + 1.5);

    y += 9;
  });

  y += 6;

  // ── Amount breakdown box ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(W / 2, y, W / 2 - pad, 36, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(W / 2, y, W / 2 - pad, 36, 3, 3, 'S');

  const bx = W / 2 + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal', bx, y + 9);
  doc.text('Discount', bx, y + 18);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${amount.toLocaleString('en-IN')}`, W - pad - 3, y + 9, { align: 'right' });
  doc.setTextColor(220, 38, 38);
  doc.text(`- Rs. ${discount.toLocaleString('en-IN')}`, W - pad - 3, y + 18, { align: 'right' });

  // ── Total line ──
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.line(W / 2 + 3, y + 22, W - pad - 3, y + 22);

  doc.setFillColor(220, 38, 38);
  doc.roundedRect(W / 2 + 3, y + 24, W / 2 - pad - 3, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PAID', bx, y + 30);
  doc.text(`Rs. ${finalAmount.toLocaleString('en-IN')}`, W - pad - 5, y + 30, { align: 'right' });

  y += 46;

  // ── Thank you footer ──
  doc.setFillColor(15, 23, 42);
  doc.rect(0, y, W, 30, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(0, y, W, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for choosing WFC! 💪', W / 2, y + 12, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Keep pushing your limits · Wolverine Fitness Club', W / 2, y + 20, { align: 'center' });

  return doc;
};

// ─── Upload PDF via backend (signed Cloudinary upload — no preset needed) ────
const uploadPdfToCloudinary = async (pdfBlob, fileName) => {
  const formData = new FormData();
  formData.append('file', pdfBlob, fileName);
  formData.append('fileName', fileName);

  const res = await CustomBaseUrl.post('/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!res.data?.url) throw new Error('PDF upload failed');
  return res.data.url;
};

// ─── Invoice Modal ───────────────────────────────────────────────────────────
const InvoiceModal = ({ data, onClose }) => {
  const { member, pkg, amount, discount, finalAmount, paymentType, advanceAmount: advPaid, balanceAmount: balAmt, paymentMethod, startDate, endDate, invoiceNo } = data;

  // stages: 'generating' | 'uploading' | 'ready' | 'error'
  const [stage, setStage] = useState('generating');
  const [pdfLocalUrl, setPdfLocalUrl] = useState(null);
  const [cloudUrl, setCloudUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileName = `WFC-Invoice-${invoiceNo}-${(member.name || 'member').replace(/\s+/g, '-')}.pdf`;

  useEffect(() => {
    initPdf();
  }, []);

  const initPdf = async () => {
    try {
      // 1. Generate PDF
      setStage('generating');
      const doc = await generateInvoicePDF(data);
      const blob = doc.output('blob');
      const localUrl = URL.createObjectURL(blob);
      setPdfLocalUrl(localUrl);

      // 2. Upload to Cloudinary
      setStage('uploading');
      const url = await uploadPdfToCloudinary(blob, fileName);
      setCloudUrl(url);

      // Patch the saved payment with the PDF URL
      if (data.savedPaymentId && url) {
        try {
          await CustomBaseUrl.patch(`/reg-payments/pdf/${data.savedPaymentId}`, { pdfUrl: url });
        } catch (patchErr) {
          console.warn('Could not update PDF URL on server:', patchErr);
        }
      }

      setStage('ready');
    } catch (e) {
      console.error('PDF/upload error:', e);
      setErrorMsg(e.message || 'Something went wrong');
      setStage('error');
    }
  };

  const savePDF = () => {
    if (!pdfLocalUrl) return;
    const a = document.createElement('a');
    a.href = pdfLocalUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const sendWhatsApp = () => {
    const phone = member.phone?.replace(/\D/g, '');

    const paymentLine = isPartly
      ? `⚡ *Advance Paid: ₹${(advPaid||0).toLocaleString('en-IN')}*\n` +
        `⏳ *Balance Due:  ₹${(balAmt||0).toLocaleString('en-IN')}*`
      : `✅ *Total Paid: ₹${finalAmount.toLocaleString('en-IN')}*`;

    const pdfSection = cloudUrl
      ? `━━━━━━━━━━━━━━━━━━━━\n📄 *Invoice PDF:*\n${cloudUrl}\n\n`
      : ``;

    const msg =
      `🏋️ *WFC – Wolverine Fitness Club*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Dear *${member.name}*,\n\n` +
      `✅ *Payment Confirmed!*\n\n` +
      `📋 Invoice: *${invoiceNo}*\n` +
      `📦 Package: *${pkg}*\n` +
      `💳 Mode: *${paymentMethod.toUpperCase()}*\n` +
      `💰 Total: ₹${amount.toLocaleString('en-IN')} | Discount: ₹${discount.toLocaleString('en-IN')}\n` +
      `${paymentLine}\n\n` +
      `📅 Start: ${new Date(startDate).toLocaleDateString('en-IN')}\n` +
      `📅 End:   ${new Date(endDate).toLocaleDateString('en-IN')}\n\n` +
      `${pdfSection}` +
      `💪 Keep pushing your limits!\n` +
      `_WFC – Wolverine Fitness Club_`;

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Send Email ───────────────────────────────────────────────────────────────
  const [emailSending, setEmailSending] = React.useState(false);
  const [emailSent,    setEmailSent]    = React.useState(false);
  const [emailError,   setEmailError]   = React.useState('');

  const sendEmail = async () => {
    const email = member?.emails;
    if (!email) {
      setEmailError('This member has no email address on record.');
      return;
    }
    setEmailSending(true);
    setEmailError('');
    try {
      const res = await CustomBaseUrl.post(`/send-email`, {
        to:            email,
        memberName:    member.name,
        invoiceNo,
        amount:        amount,
        finalAmount:   finalAmount,
        balanceAmount: isPartly ? balAmt : 0,
        packageName:   pkg,
        startDate,
        endDate,
        paymentMode:   paymentMethod,
        pdfUrl:        cloudUrl || '',
        isReminder:    false,
      });
      if (res.data.success) {
        setEmailSent(true);
      } else {
        setEmailError(res.data.message || 'Email failed to send.');
      }
    } catch (e) {
      setEmailError('Network error — could not reach server.');
    } finally {
      setEmailSending(false);
    }
  };

  const isPartly = paymentType === 'partly';
  const rows = [
    ['Invoice No', invoiceNo],
    ['Member', member.name],
    ['Phone', member.phone || '—'],
    ['Package', pkg],
    ['Payment Mode', paymentMethod.toUpperCase()],
    ['Payment Type', isPartly ? '⚡ Partly (Advance)' : '✅ Full Payment'],
    ['Amount', `₹${amount.toLocaleString('en-IN')}`],
    ['Discount', discount > 0 ? `₹${discount.toLocaleString('en-IN')}` : '—'],
    ['Total Payable', `₹${finalAmount.toLocaleString('en-IN')}`],
    ...(isPartly ? [
      ['Advance Paid', `₹${(advPaid || 0).toLocaleString('en-IN')}`],
      ['Balance Due',  `₹${(balAmt  || 0).toLocaleString('en-IN')}`],
    ] : []),
    ['Start Date', new Date(startDate).toLocaleDateString('en-IN')],
    ['End Date', new Date(endDate).toLocaleDateString('en-IN')],
    ['Issued On', new Date().toLocaleDateString('en-IN')],
  ];

  const stageLabel = {
    generating: 'Generating PDF…',
    uploading: 'Uploading to cloud…',
    ready: 'Ready to send!',
    error: 'Something went wrong',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'popIn .2s ease' }}>

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-red-900 text-white p-6 text-center">
          <div className="text-3xl mb-1">💪</div>
          <h2 className="text-lg font-black tracking-wide">WFC – Wolverine Fitness Club</h2>
          <p className="text-slate-300 text-xs mt-1">Your Ultimate Fitness Destination</p>
          <div className="mt-3 inline-block bg-white/10 px-3 py-1 rounded-full text-xs font-mono">{invoiceNo}</div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[65vh] overflow-y-auto">

          {/* Success badge */}
          <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-2 rounded-xl mb-4">
            <Check size={14} />
            <span className="text-xs font-semibold">Payment Successful</span>
          </div>

          {/* Invoice rows */}
          <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 mb-4">
            {rows.map(([label, val]) => (
              <div key={label} className="flex justify-between items-center px-4 py-2.5">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs font-semibold text-slate-800">{val}</span>
              </div>
            ))}
          </div>

          {/* Total / Advance / Balance */}
          {isPartly ? (
            <div className="mb-5 space-y-2">
              <div className="flex justify-between items-center bg-slate-100 rounded-xl px-4 py-2.5">
                <span className="text-xs text-slate-500">Total Payable</span>
                <span className="text-sm font-bold text-slate-800">₹{finalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <span className="text-xs font-semibold text-amber-700">⚡ Advance Paid Now</span>
                <span className="text-lg font-black text-amber-700">₹{(advPaid || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <span className="text-xs font-semibold text-red-600">⏳ Balance Due</span>
                <span className="text-lg font-black text-red-600">₹{(balAmt || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl px-4 py-3 flex justify-between items-center mb-5">
              <span className="text-sm font-medium">Total Paid</span>
              <span className="text-xl font-black">₹{finalAmount.toLocaleString('en-IN')}</span>
            </div>
          )}

          {/* Stage status bar */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-xs font-medium ${
            stage === 'ready' ? 'bg-emerald-50 text-emerald-700' :
            stage === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {(stage === 'generating' || stage === 'uploading') && (
              <Loader size={14} className="animate-spin flex-shrink-0" />
            )}
            {stage === 'ready' && <Check size={14} className="flex-shrink-0" />}
            {stage === 'error' && <span className="flex-shrink-0">⚠️</span>}
            <div>
              <p className="font-semibold">{stageLabel[stage]}</p>
              {stage === 'uploading' && <p className="text-[10px] opacity-70">Uploading PDF to cloud for WhatsApp link…</p>}
              {stage === 'ready' && cloudUrl && <p className="text-[10px] opacity-70 truncate">PDF hosted · tap WhatsApp to send link</p>}
              {stage === 'error' && <p className="text-[10px]">{errorMsg}</p>}
            </div>
          </div>

          {/* Retry upload if failed */}
          {stage === 'error' && pdfLocalUrl && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 mb-4 flex items-center justify-between gap-3">
              <p className="font-medium">⚠️ Cloud upload failed. You can still save the PDF locally and send WhatsApp without the link.</p>
              <button onClick={initPdf}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition whitespace-nowrap">
                Retry Upload
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={savePDF}
              disabled={!pdfLocalUrl}
              className="flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-slate-700 active:scale-95 transition-all shadow disabled:opacity-40"
            >
              <Download size={15} />
              Save PDF
            </button>

            <button
              onClick={sendWhatsApp}
              disabled={stage === 'generating' || stage === 'uploading'}
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1ebe5d] active:scale-95 transition-all shadow disabled:opacity-40"
            >
              {(stage === 'generating' || stage === 'uploading')
                ? <Loader size={15} className="animate-spin" />
                : <MessageCircle size={15} />
              }
              {stage === 'ready' ? 'WhatsApp' : stage === 'error' ? 'WhatsApp' : 'Please wait…'}
            </button>
          </div>

          {/* Email button */}
          <button
            onClick={sendEmail}
            disabled={emailSending || emailSent || !member?.emails}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold active:scale-95 transition-all shadow ${
              emailSent
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : !member?.emails
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {emailSending
              ? <><Loader size={15} className="animate-spin" /> Sending Email…</>
              : emailSent
              ? <><Check size={15} /> Email Sent to {member.emails}</>
              : !member?.emails
              ? <><Mail size={15} /> No Email on Record</>
              : <><Mail size={15} /> Send Invoice by Email</>
            }
          </button>
          {emailError && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{emailError}</p>
          )}

          {stage === 'ready' && cloudUrl && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-800">
              ✅ PDF uploaded to cloud — WhatsApp message will include a <strong>direct download link</strong> for the member.
            </div>
          )}

          <button onClick={onClose} className="mt-4 w-full text-slate-400 text-xs hover:text-slate-600 transition py-1">
            Close
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
};

// ─── Main AddPayment Page ────────────────────────────────────────────────────
const AddPayment = () => {
  const navigate = useNavigate();

  // Member search
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Package
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [customPkgName, setCustomPkgName] = useState('');
  const [durationType, setDurationType] = useState('months'); // months | custom
  const [durationMonths, setDurationMonths] = useState(1);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Payment
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentType, setPaymentType] = useState('full');   // 'full' | 'partly'
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // UI state
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await CustomBaseUrl.get(`/fetch`);
      setMembers(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  // Filtered members for dropdown
  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  ).slice(0, 8);

  const selectMember = (m) => {
    setSelectedMember(m);
    setSearch(m.name);
    setShowDropdown(false);
  };

  const clearMember = () => {
    setSelectedMember(null);
    setSearch('');
  };

  // When package selected, auto-fill amount
  const handlePkgSelect = (pkg) => {
    setSelectedPkg(pkg.id);
    if (pkg.id !== 'custom') {
      setAmount(String(pkg.price));
      if (pkg.months > 0) {
        setDurationType('months');
        setDurationMonths(pkg.months);
      }
    } else {
      setAmount('');
    }
  };

  // Compute dates
  const getDateRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (durationType === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const totalAfterDiscount = Math.max(0, (parseFloat(amount) || 0) - (parseFloat(discount) || 0));
  const finalAmount = totalAfterDiscount; // total payable (used for UPI QR)
  const advancePaid = paymentType === 'partly' ? Math.max(0, parseFloat(advanceAmount) || 0) : totalAfterDiscount;
  const balanceAmount = paymentType === 'partly' ? Math.max(0, totalAfterDiscount - advancePaid) : 0;

  const handlePayment = async () => {
    if (!selectedMember) return alert('Please select a member');
    if (!selectedPkg) return alert('Please select a package');
    if (!amount || parseFloat(amount) <= 0) return alert('Please enter amount');
    if (selectedPkg === 'custom' && !customPkgName) return alert('Enter custom package name');
    if (durationType === 'custom' && (!customStart || !customEnd)) return alert('Select date range');

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const pkgLabel = selectedPkg === 'custom'
        ? customPkgName
        : PRESET_PACKAGES.find(p => p.id === selectedPkg)?.label;

      const invoiceNo = `WFC-INV-${Date.now().toString().slice(-8)}`;

      // ── Save payment to MongoDB via backend ─────────────────────────────────
      const totalAftDiscount = Math.max(0, parseFloat(amount) - (parseFloat(discount) || 0));
      const advPaid = paymentType === 'partly' ? Math.max(0, parseFloat(advanceAmount) || 0) : totalAftDiscount;
      const balAmt  = paymentType === 'partly' ? Math.max(0, totalAftDiscount - advPaid) : 0;

      const payload = {
        registrationId: selectedMember._id,
        package:        pkgLabel,
        amount:         parseFloat(amount),
        discount:       parseFloat(discount) || 0,
        finalAmount:    totalAftDiscount,
        paymentType,                    // 'full' | 'partly'
        advanceAmount:  advPaid,        // amount paid now
        balanceAmount:  balAmt,         // remaining due
        paymentMode:    paymentMethod,
        startDate,
        endDate,
        invoiceNo,
        pdfUrl: '',
      };

      const res = await CustomBaseUrl.post(`/reg-payments`, payload);

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to save payment');
      }

      // ── Show invoice modal ──────────────────────────────────────────────────
      setInvoiceData({
        member: selectedMember,
        pkg: pkgLabel,
        amount: parseFloat(amount),
        discount: parseFloat(discount) || 0,
        finalAmount: payload.finalAmount,
        paymentType,
        advanceAmount: advPaid,
        balanceAmount: balAmt,
        paymentMethod,
        startDate,
        endDate,
        invoiceNo,
        savedPaymentId: res.data.payment._id,
      });
    } catch (e) {
      console.error('Payment error:', e);
      alert('Payment failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const pkgNameForDisplay = selectedPkg === 'custom'
    ? (customPkgName || 'Custom')
    : PRESET_PACKAGES.find(p => p.id === selectedPkg)?.label || '';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-200 transition">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Payment</h1>
            <p className="text-slate-500 text-sm">Create a membership payment</p>
          </div>
        </div>

        {/* ── STEP 1: Member ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">1 · Member</p>

          <div className="relative" ref={searchRef}>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-red-400 focus-within:border-transparent bg-slate-50">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelectedMember(null); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search member by name or phone…"
                className="flex-1 bg-transparent text-sm outline-none text-slate-800 placeholder-slate-400"
              />
              {search && (
                <button onClick={clearMember}><X size={14} className="text-slate-400" /></button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && search && filtered.length > 0 && !selectedMember && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                {filtered.map(m => (
                  <button
                    key={m._id}
                    onClick={() => selectMember(m)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs flex-shrink-0">
                      {m.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.phone} · {m.packages || 'No plan'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected member chip */}
          {selectedMember && (
            <div className="mt-3 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {selectedMember.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{selectedMember.name}</p>
                <p className="text-xs text-slate-500">{selectedMember.phone} · Age {selectedMember.age}</p>
              </div>
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">Selected</span>
            </div>
          )}
        </div>

        {/* ── STEP 2: Package ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">2 · Package</p>

          <div className="grid grid-cols-5 gap-2">
            {PRESET_PACKAGES.map(pkg => {
              const Icon = pkg.icon;
              const active = selectedPkg === pkg.id;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handlePkgSelect(pkg)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center ${
                    active ? 'border-red-500 bg-red-50 shadow-sm scale-[1.03]' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-red-600' : 'text-slate-400'} />
                  <span className={`text-xs font-bold ${active ? 'text-red-700' : 'text-slate-600'}`}>{pkg.label}</span>
                  {pkg.price > 0 && (
                    <span className={`text-[10px] ${active ? 'text-red-500' : 'text-slate-400'}`}>₹{(pkg.price/100).toFixed(0)}k</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom package name */}
          {selectedPkg === 'custom' && (
            <input
              value={customPkgName}
              onChange={e => setCustomPkgName(e.target.value)}
              placeholder="Enter custom package name…"
              className="mt-3 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          )}

          {/* Duration */}
          {selectedPkg && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">Duration</p>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setDurationType('months')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${durationType === 'months' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setDurationType('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${durationType === 'custom' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  Custom Range
                </button>
              </div>

              {durationType === 'months' ? (
                <div className="grid grid-cols-6 gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <button
                      key={m}
                      onClick={() => setDurationMonths(m)}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${
                        durationMonths === m ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-red-300'
                      }`}
                    >
                      {m}mo
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">From</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">To</label>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STEP 3: Amount ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">3 · Amount</p>

          {/* Amount + Discount */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Discount (₹)</label>
              <div className="relative">
                <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>
          </div>

          {/* Total after discount */}
          {amount && (
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl px-4 py-3 flex justify-between items-center mb-4">
              <span className="text-sm font-medium opacity-90">Total Payable</span>
              <span className="text-xl font-black">₹{totalAfterDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}

          {/* Payment Type toggle */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Payment Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setPaymentType('full'); setAdvanceAmount(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  paymentType === 'full'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Check size={15} />
                Full Payment
              </button>
              <button
                onClick={() => setPaymentType('partly')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  paymentType === 'partly'
                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Clock size={15} />
                Partly (Advance)
              </button>
            </div>
          </div>

          {/* Partly payment fields */}
          {paymentType === 'partly' && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              {/* Advance Amount */}
              <div>
                <label className="text-xs font-semibold text-amber-700 mb-1.5 block">Advance Paid (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={e => setAdvanceAmount(e.target.value)}
                    placeholder="0"
                    max={totalAfterDiscount}
                    className="w-full pl-7 pr-3 py-2.5 border border-amber-300 rounded-xl text-sm font-bold text-amber-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Balance Amount — readonly */}
              <div>
                <label className="text-xs font-semibold text-red-600 mb-1.5 block">Balance Due (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    value={balanceAmount || ''}
                    readOnly
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2.5 border border-red-200 rounded-xl text-sm font-bold text-red-600 bg-red-50 cursor-not-allowed focus:outline-none"
                  />
                </div>
              </div>

              {/* Summary row */}
              {advanceAmount && (
                <div className="col-span-2 flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200 text-xs">
                  <span className="text-slate-500">Total <span className="font-bold text-slate-800">₹{totalAfterDiscount.toLocaleString('en-IN')}</span></span>
                  <span className="text-slate-300">−</span>
                  <span className="text-slate-500">Advance <span className="font-bold text-amber-700">₹{advancePaid.toLocaleString('en-IN')}</span></span>
                  <span className="text-slate-300">=</span>
                  <span className="text-slate-500">Balance <span className="font-bold text-red-600">₹{balanceAmount.toLocaleString('en-IN')}</span></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STEP 4: Payment Method ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">4 · Payment Method</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'cash', label: 'Cash', Icon: Banknote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
              { id: 'upi', label: 'UPI', Icon: Smartphone, color: 'text-violet-600 bg-violet-50 border-violet-200' },
              { id: 'card', label: 'Card', Icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200' },
            ].map(({ id, label, Icon, color }) => (
              <button
                key={id}
                onClick={() => setPaymentMethod(id)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                  paymentMethod === id
                    ? `${color} border-current shadow-sm scale-[1.03]`
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-bold">{label}</span>
              </button>
            ))}
          </div>

          {/* UPI QR — replace YOUR_UPI_ID@upi with your real UPI ID e.g. 9876543210@ybl */}
          {paymentMethod === 'upi' && finalAmount > 0 && (
            <div className="mt-4">
              <UpiQR
                amount={finalAmount}
                upiId="manikan2033-1@okhdfcbank"
                name="WFC Wolverine Fitness"
              />
            </div>
          )}
          {paymentMethod === 'upi' && finalAmount === 0 && (
            <p className="mt-3 text-center text-xs text-slate-400">Enter amount above to show QR code</p>
          )}
        </div>

        {/* ── Summary preview ── */}
        {selectedMember && selectedPkg && amount && (
          <div className="bg-slate-800 text-white rounded-2xl p-4 mb-5 text-sm">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Summary</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-slate-400">Member</span><span className="font-semibold">{selectedMember.name}</span>
              <span className="text-slate-400">Package</span><span className="font-semibold">{pkgNameForDisplay}</span>
              <span className="text-slate-400">Duration</span>
              <span className="font-semibold">
                {durationType === 'months' ? `${durationMonths} month${durationMonths > 1 ? 's' : ''}` : `${customStart} → ${customEnd}`}
              </span>
              <span className="text-slate-400">Mode</span><span className="font-semibold capitalize">{paymentMethod}</span>
              <span className="text-slate-400">Total</span><span className="font-black text-red-400 text-sm">₹{totalAfterDiscount.toLocaleString('en-IN')}</span>
              <span className="text-slate-400">Payment</span>
              <span className={`font-bold text-sm ${paymentType === 'full' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {paymentType === 'full' ? 'Full Payment' : 'Partly (Advance)'}
              </span>
              {paymentType === 'partly' && advanceAmount && <>
                <span className="text-slate-400">Advance</span><span className="font-bold text-amber-400">₹{advancePaid.toLocaleString('en-IN')}</span>
                <span className="text-slate-400">Balance</span><span className="font-bold text-red-400">₹{balanceAmount.toLocaleString('en-IN')}</span>
              </>}
            </div>
          </div>
        )}

        {/* ── Pay Button ── */}
        <button
          onClick={handlePayment}
          disabled={loading || !selectedMember || !selectedPkg || !amount}
          className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-red-700 active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200"
        >
          {loading ? 'Processing…' : paymentType === 'full'
            ? `Confirm Full Payment${totalAfterDiscount ? ` · ₹${totalAfterDiscount.toLocaleString('en-IN')}` : ''}`
            : `Confirm Advance Payment${advancePaid ? ` · ₹${advancePaid.toLocaleString('en-IN')}` : ''}`
          }
        </button>
      </div>

      {/* Invoice Modal */}
      {invoiceData && (
        <InvoiceModal data={invoiceData} onClose={() => { setInvoiceData(null); navigate('/payments'); }} />
      )}
    </div>
  );
};

export default AddPayment;
