import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Printer, ArrowLeft, Download, Phone, Mail, MapPin, CheckCircle, Shield } from 'lucide-react';
import { billsApi } from '../../services/bills';
import { settingsApi } from '../../services/settings';
import { formatCurrency, formatDate, formatDateTime, numberToWords } from '../../utils/format';
import { DEFAULT_BUSINESS_CONFIG } from '../../utils/businessConfig';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

export default function Invoice() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([billsApi.get(id), settingsApi.get()])
      .then(([b, s]) => {
        setBill(b);
        setSettings(s || DEFAULT_BUSINESS_CONFIG);
      })
      .catch((err) => {
        toast.error(err.message);
        navigate('/billing');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner label="Loading GST Tax Invoice..." />;
  if (!bill) return null;

  // Active configuration (database settings merged with defaults)
  const business = {
    name: settings?.business_name || DEFAULT_BUSINESS_CONFIG.business_name,
    tagline: settings?.tagline || DEFAULT_BUSINESS_CONFIG.tagline,
    proprietor: settings?.proprietor || DEFAULT_BUSINESS_CONFIG.proprietor,
    services: settings?.services || DEFAULT_BUSINESS_CONFIG.services,
    phone: settings?.phone || DEFAULT_BUSINESS_CONFIG.phone,
    whatsapp: settings?.whatsapp || DEFAULT_BUSINESS_CONFIG.whatsapp,
    email: settings?.email || DEFAULT_BUSINESS_CONFIG.email,
    address: settings?.address || DEFAULT_BUSINESS_CONFIG.address,
    gstin: settings?.gst_number?.trim() ? settings.gst_number : null,
    state: settings?.state || DEFAULT_BUSINESS_CONFIG.state,
    state_code: settings?.state_code || DEFAULT_BUSINESS_CONFIG.state_code,
    terms: settings?.terms || DEFAULT_BUSINESS_CONFIG.terms,
  };

  const isInterstate = Boolean(bill.is_interstate);
  const items = bill.items || [];

  // Compute or read financial totals
  const rawSubtotal = Number(bill.subtotal) || items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const discountAmount = Number(bill.discount) || 0;
  const taxableAmount = Number(bill.taxable_amount) || Math.max(0, rawSubtotal - discountAmount);
  const totalCgst = Number(bill.cgst) || 0;
  const totalSgst = Number(bill.sgst) || 0;
  const totalIgst = Number(bill.igst) || 0;
  const totalGst = Number(bill.total_gst) || totalCgst + totalSgst + totalIgst;
  const roundOff = Number(bill.round_off) || 0;
  const grandTotal = Number(bill.grand_total || bill.total) || Math.round(taxableAmount + totalGst);

  // Group items by HSN for the GST tax breakdown table
  const hsnSummary = items.reduce((acc, item) => {
    const hsn = item.hsn_code || '8473';
    const itemTaxable = Number(item.taxable_amount) || (Number(item.price) * Number(item.quantity) - Number(item.discount || 0));
    const rate = Number(item.gst_rate) || 18;
    const cgst = Number(item.cgst) || (isInterstate ? 0 : (itemTaxable * (rate / 2)) / 100);
    const sgst = Number(item.sgst) || (isInterstate ? 0 : (itemTaxable * (rate / 2)) / 100);
    const igst = Number(item.igst) || (isInterstate ? (itemTaxable * rate) / 100 : 0);

    if (!acc[hsn]) {
      acc[hsn] = { hsn, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, rate };
    }
    acc[hsn].taxable += itemTaxable;
    acc[hsn].cgst += cgst;
    acc[hsn].sgst += sgst;
    acc[hsn].igst += igst;
    acc[hsn].totalTax += cgst + sgst + igst;
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Top Action Bar (Hidden in Print / PDF) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <Link
          to="/billing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Billing
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
          >
            + Create New Bill
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary text-xs sm:text-sm py-2 px-4 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Main GST Invoice Container (A4 Formatted) */}
      <div
        id="invoice-document"
        className="bg-white rounded-xl border border-slate-300 shadow-lg p-6 sm:p-8 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none"
        style={{ minHeight: '297mm' }}
      >
        {/* ============================================================ */}
        {/* 1. HEADER SECTION (Brand, Logo, Services, Address, Badge)    */}
        {/* ============================================================ */}
        <div className="border-b-2 border-amber-500 pb-5 mb-5">
          {/* Top Row: Logo & Brand Info & Tax Invoice Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Logo + Business Header */}
            <div className="flex items-center gap-4">
              <div className="shrink-0 bg-black rounded-lg p-1.5 border border-amber-500/40 shadow-sm">
                <img
                  src="/logo.jpeg"
                  alt="G - TECHNOLOGIES"
                  className="h-16 sm:h-20 w-auto object-contain block"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                    {business.name}
                  </h1>
                </div>
                <div className="text-xs sm:text-sm font-bold tracking-widest text-amber-600 uppercase mt-0.5">
                  {business.tagline}
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">
                  Proprietor: <span className="font-bold text-slate-900">{business.proprietor}</span>
                </div>
              </div>
            </div>

            {/* Document Header Badge */}
            <div className="text-left sm:text-right border-l-2 sm:border-l-0 pl-3 sm:pl-0 border-amber-500">
              <div className="inline-block bg-slate-950 text-amber-400 font-extrabold text-sm sm:text-base px-3.5 py-1 rounded tracking-wide border border-amber-500/50">
                TAX INVOICE
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">
                Original for Recipient
              </div>
              {business.gstin ? (
                <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                  GSTIN: <span className="text-brand-700">{business.gstin}</span>
                </div>
              ) : null}
              <div className="text-[11px] text-slate-600 font-medium">
                State: {business.state} ({business.state_code})
              </div>
            </div>
          </div>

          {/* Middle Row: Services Bar */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-lg">
            <div className="space-y-0.5">
              <div className="font-medium text-slate-800">
                • Mobile service | System service | Laptop service
              </div>
              <div className="font-medium text-slate-800">
                • Printer service | CCTV camera installation
              </div>
              <div className="font-semibold text-amber-700">
                • All models chip level service
              </div>
            </div>
            <div className="sm:text-right space-y-0.5 text-slate-600">
              <div className="flex items-center sm:justify-end gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>Phone: <strong>{business.phone}</strong> | WhatsApp: <strong>{business.whatsapp}</strong></span>
              </div>
              <div className="flex items-center sm:justify-end gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>Email: {business.email}</span>
              </div>
              <div className="flex items-center sm:justify-end gap-1.5 text-[11px] text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{business.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. INVOICE META & CUSTOMER DETAILS GRID                       */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs bg-white border border-slate-200 rounded-lg p-3.5">
          {/* Left: Customer Information */}
          <div className="space-y-1 pr-2">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-amber-800 border-b border-amber-100 pb-1 mb-1.5 flex items-center gap-1.5">
              <span>Billed To / Customer Details</span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              {bill.customer_name || 'Walk-in Customer'}
            </div>
            {bill.customer_phone && (
              <div className="text-slate-600">
                <span className="font-medium text-slate-500">Phone:</span> {bill.customer_phone}
              </div>
            )}
            {bill.customer_address && (
              <div className="text-slate-600">
                <span className="font-medium text-slate-500">Address:</span> {bill.customer_address}
              </div>
            )}
            {bill.customer_gstin && (
              <div className="text-slate-600 font-mono">
                <span className="font-medium text-slate-500">Customer GSTIN:</span> {bill.customer_gstin}
              </div>
            )}
            <div className="text-slate-600">
              <span className="font-medium text-slate-500">Place of Supply:</span>{' '}
              {isInterstate ? 'Other State (Inter-State)' : `${business.state} (${business.state_code})`}
            </div>
          </div>

          {/* Right: Invoice Reference Information */}
          <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-amber-800 border-b border-amber-100 pb-1 mb-1.5">
              Invoice Reference
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-bold font-mono text-slate-900">{bill.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Date:</span>
              <span className="font-semibold text-slate-800">{formatDate(bill.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Time:</span>
              <span className="text-slate-700">{formatDateTime(bill.created_at).split(',')[1] || ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded text-[11px]">
                {bill.payment_method || 'Cash'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax Type:</span>
              <span className="font-medium text-slate-700">
                {isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. ITEM TABLE (GST Compliant)                                */}
        {/* ============================================================ */}
        <div className="overflow-x-auto mb-4 border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white font-semibold border-b border-slate-900">
                <th className="py-2.5 px-2 text-center w-8">#</th>
                <th className="py-2.5 px-3">Description of Goods / Services</th>
                <th className="py-2.5 px-2 text-center w-16">HSN/SAC</th>
                <th className="py-2.5 px-2 text-center w-12">Qty</th>
                <th className="py-2.5 px-2 text-right w-16">Rate (₹)</th>
                <th className="py-2.5 px-2 text-right w-14">Disc (₹)</th>
                <th className="py-2.5 px-2 text-right w-20">Taxable (₹)</th>
                {!isInterstate ? (
                  <>
                    <th className="py-2.5 px-2 text-center w-12">CGST</th>
                    <th className="py-2.5 px-2 text-center w-12">SGST</th>
                  </>
                ) : (
                  <th className="py-2.5 px-2 text-center w-14">IGST</th>
                )}
                <th className="py-2.5 px-3 text-right w-24">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {items.map((item, index) => {
                const qty = Number(item.quantity) || 1;
                const price = Number(item.price) || 0;
                const gross = price * qty;
                const disc = Number(item.discount) || 0;
                const taxable = Number(item.taxable_amount) || Math.max(0, gross - disc);
                const gstRate = Number(item.gst_rate) || 18;
                const halfRate = gstRate / 2;
                const cgst = Number(item.cgst) || (isInterstate ? 0 : (taxable * halfRate) / 100);
                const sgst = Number(item.sgst) || (isInterstate ? 0 : (taxable * halfRate) / 100);
                const igst = Number(item.igst) || (isInterstate ? (taxable * gstRate) / 100 : 0);
                const lineTotal = Number(item.total) || Math.round((taxable + cgst + sgst + igst) * 100) / 100;

                return (
                  <tr key={item.id || index} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-2 text-center font-medium text-slate-500">{index + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{item.product_name || item.name}</div>
                      {item.sku && <div className="text-[10px] text-slate-400">SKU: {item.sku}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600">
                      {item.hsn_code || '8473'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-900">{qty}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700">{price.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-500">{disc > 0 ? disc.toFixed(2) : '—'}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-900">{taxable.toFixed(2)}</td>
                    {!isInterstate ? (
                      <>
                        <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                          <div>{halfRate}%</div>
                          <div className="text-[10px] text-slate-400">₹{cgst.toFixed(2)}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                          <div>{halfRate}%</div>
                          <div className="text-[10px] text-slate-400">₹{sgst.toFixed(2)}</div>
                        </td>
                      </>
                    ) : (
                      <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                        <div>{gstRate}%</div>
                        <div className="text-[10px] text-slate-400">₹{igst.toFixed(2)}</div>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-950">
                      {lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ============================================================ */}
        {/* 4. GST TAX BREAKDOWN & FINANCIAL SUMMARY GRID                 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-5">
          {/* Left: GST Tax Analysis Table */}
          <div className="md:col-span-6 space-y-3">
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/60">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                GST Tax Summary Analysis
              </div>
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 font-semibold">
                    <th className="py-1 px-1">HSN/SAC</th>
                    <th className="py-1 px-1 text-right">Taxable</th>
                    {!isInterstate ? (
                      <>
                        <th className="py-1 px-1 text-right">CGST</th>
                        <th className="py-1 px-1 text-right">SGST</th>
                      </>
                    ) : (
                      <th className="py-1 px-1 text-right">IGST</th>
                    )}
                    <th className="py-1 px-1 text-right">Tax Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.values(hsnSummary).map((row) => (
                    <tr key={row.hsn}>
                      <td className="py-1 px-1 font-mono">{row.hsn}</td>
                      <td className="py-1 px-1 text-right">₹{row.taxable.toFixed(2)}</td>
                      {!isInterstate ? (
                        <>
                          <td className="py-1 px-1 text-right">₹{row.cgst.toFixed(2)}</td>
                          <td className="py-1 px-1 text-right">₹{row.sgst.toFixed(2)}</td>
                        </>
                      ) : (
                        <td className="py-1 px-1 text-right">₹{row.igst.toFixed(2)}</td>
                      )}
                      <td className="py-1 px-1 text-right font-medium">₹{row.totalTax.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Amount in Words */}
            <div className="border border-amber-200 bg-amber-50/50 p-2.5 rounded-lg text-xs">
              <span className="font-bold text-slate-700">Amount Chargeable (in words):</span>
              <div className="font-semibold text-slate-900 italic mt-0.5">
                {numberToWords(grandTotal)}
              </div>
            </div>
          </div>

          {/* Right: Summary Figures */}
          <div className="md:col-span-6 flex justify-end">
            <div className="w-full sm:w-80 space-y-1 text-xs border border-slate-200 rounded-lg p-3 bg-white">
              <div className="flex justify-between text-slate-600 py-0.5">
                <span>Total Gross Amount:</span>
                <span className="font-medium text-slate-800">₹{rawSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 py-0.5">
                <span>Discount:</span>
                <span className="font-medium text-slate-800">(-) ₹{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-semibold py-1 border-t border-slate-100">
                <span>Total Taxable Amount:</span>
                <span>₹{taxableAmount.toFixed(2)}</span>
              </div>
              {!isInterstate ? (
                <>
                  <div className="flex justify-between text-slate-600 py-0.5">
                    <span>Central Tax (CGST):</span>
                    <span className="font-medium text-slate-800">₹{totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 py-0.5">
                    <span>State Tax (SGST):</span>
                    <span className="font-medium text-slate-800">₹{totalSgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600 py-0.5">
                  <span>Integrated Tax (IGST):</span>
                  <span className="font-medium text-slate-800">₹{totalIgst.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 py-0.5 border-t border-slate-100">
                <span>Total Tax Amount (GST):</span>
                <span className="font-semibold text-slate-800">₹{totalGst.toFixed(2)}</span>
              </div>
              {roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 py-0.5">
                  <span>Round Off:</span>
                  <span>{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
                </div>
              )}
              {/* Grand Total Highlight Badge */}
              <div className="flex justify-between items-center text-sm font-extrabold text-amber-400 bg-slate-950 p-2.5 rounded-md mt-2 border border-amber-500/50">
                <span>Grand Total:</span>
                <span className="text-base tracking-wide font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. FOOTER SECTION (Terms, Signature, Thank you note)         */}
        {/* ============================================================ */}
        <div className="border-t border-slate-300 pt-4 mt-6 text-xs text-slate-600 page-break-inside-avoid">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Terms & Notes */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-amber-800">
                Terms & Conditions / Service Policy
              </div>
              <div className="text-[11px] text-slate-500 whitespace-pre-line leading-relaxed">
                {business.terms}
              </div>
              <div className="text-[11px] text-slate-700 font-medium pt-1">
                UPI / GPay / PhonePe Accepted: <span className="font-bold">{business.phone}</span>
              </div>
            </div>

            {/* Signature Block */}
            <div className="sm:text-right flex flex-col justify-between items-start sm:items-end">
              <div>
                <div className="text-xs font-bold text-slate-900">For {business.name}</div>
                <div className="text-[10px] text-amber-700 font-semibold">{business.tagline}</div>
              </div>

              <div className="mt-12 pt-1 border-t border-slate-400 w-44 text-center sm:text-right">
                <div className="font-bold text-slate-900">{business.proprietor}</div>
                <div className="text-[10px] text-slate-500">Authorized Signatory / Proprietor</div>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-400 font-medium mt-6 pt-3 border-t border-slate-100">
            Thank you for your business with <span className="font-semibold text-slate-700">{business.name}</span>!
          </div>
        </div>
      </div>
    </div>
  );
}
