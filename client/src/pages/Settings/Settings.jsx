import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { settingsApi } from '../../services/settings';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const DATE_FORMATS = ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'];

export default function Settings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    settingsApi
      .get()
      .then((s) =>
        setForm({
          business_name: s.business_name || 'G - TECHNOLOGIES',
          tagline: s.tagline || 'CHIP LEVEL SERVICE',
          proprietor: s.proprietor || 'GOKUL.P',
          services:
            s.services ||
            'Mobile service | System service | Laptop service\nPrinter service | CCTV camera installation\nAll models chip level service',
          address: s.address || 'Perumal Malai Road, Narasothipatti,\nKuranguchavadi, Salem - 636 004.',
          phone: s.phone || '86108 72917',
          whatsapp: s.whatsapp || '88833 57115',
          email: s.email || 'vaalugokul63@gmail.com',
          gst_number: s.gst_number || '',
          state: s.state || 'Tamil Nadu',
          state_code: s.state_code || '33',
          default_gst_rate: s.default_gst_rate !== undefined ? Number(s.default_gst_rate) : 18,
          invoice_prefix: s.invoice_prefix || 'INV',
          currency: s.currency || 'INR',
          date_format: s.date_format || 'DD-MM-YYYY',
          low_stock_threshold_percent: s.low_stock_threshold_percent ?? 100,
          terms:
            s.terms ||
            '1. Goods / components once sold will be covered under standard warranty.\n2. Service warranty applies as per chip-level service policy.\n3. Subject to Salem jurisdiction.',
        })
      )
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.business_name.trim()) {
      toast.error('Business name is required.');
      return;
    }
    setSaving(true);
    try {
      await settingsApi.update(form);
      toast.success('Settings saved successfully.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) return <Spinner label="Loading settings..." />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Business & GST configuration used across invoices and reports</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Branding */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-4 pb-3 border-b border-slate-100">
            <img src="/logo.jpeg" alt="G - TECHNOLOGIES" className="w-16 h-10 object-contain rounded border border-slate-200 bg-black" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Business Information</h2>
              <p className="text-xs text-slate-500">Official details printed on TAX & GST Invoices</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Business / Brand Name *</label>
              <input className="input font-semibold" value={form.business_name} onChange={(e) => update('business_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Tagline</label>
              <input className="input" value={form.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="CHIP LEVEL SERVICE" />
            </div>
            <div>
              <label className="label">Proprietor Name</label>
              <input className="input" value={form.proprietor} onChange={(e) => update('proprietor', e.target.value)} placeholder="GOKUL.P" />
            </div>
            <div>
              <label className="label">Primary Phone</label>
              <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="86108 72917" />
            </div>
            <div>
              <label className="label">WhatsApp Number</label>
              <input className="input" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="88833 57115" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="vaalugokul63@gmail.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Full Shop / Office Address</label>
              <textarea className="input" rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Services List (Displayed on Invoice Header)</label>
              <textarea className="input" rows={3} value={form.services} onChange={(e) => update('services', e.target.value)} />
            </div>
          </div>
        </div>

        {/* GST & Tax Details */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">GST & Tax Configuration</h2>
          <p className="text-xs text-slate-500 mb-4">GSTIN is displayed on invoices only when configured (no fake numbers are generated).</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">GSTIN / GST Number (optional)</label>
              <input
                className="input uppercase font-mono"
                placeholder="Leave blank if not registered"
                value={form.gst_number}
                onChange={(e) => update('gst_number', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label">Default GST Rate (%)</label>
              <select className="input" value={form.default_gst_rate} onChange={(e) => update('default_gst_rate', Number(e.target.value))}>
                <option value={0}>0% (Tax Exempt / Nil)</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST (Standard)</option>
                <option value={28}>28% GST</option>
              </select>
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="Tamil Nadu" />
            </div>
            <div>
              <label className="label">State Code</label>
              <input className="input" value={form.state_code} onChange={(e) => update('state_code', e.target.value)} placeholder="33" />
            </div>
            <div>
              <label className="label">Invoice Prefix</label>
              <input className="input uppercase" value={form.invoice_prefix} onChange={(e) => update('invoice_prefix', e.target.value)} placeholder="INV" />
            </div>
            <div>
              <label className="label">Currency</label>
              <input className="input" value={form.currency} onChange={(e) => update('currency', e.target.value)} placeholder="INR" />
            </div>
          </div>
        </div>

        {/* Invoice Terms & Additional App Settings */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Invoice Terms & Application Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Invoice Terms & Conditions / Notes</label>
              <textarea className="input text-xs font-mono" rows={3} value={form.terms} onChange={(e) => update('terms', e.target.value)} />
            </div>
            <div>
              <label className="label">Date Format</label>
              <select className="input" value={form.date_format} onChange={(e) => update('date_format', e.target.value)}>
                {DATE_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Low Stock Threshold (%)</label>
              <input
                type="number"
                min="1"
                max="200"
                className="input"
                value={form.low_stock_threshold_percent}
                onChange={(e) => update('low_stock_threshold_percent', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="submit" className="btn-primary px-6" disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
