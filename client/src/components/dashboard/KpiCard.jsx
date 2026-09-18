import React from 'react';

const TONES = {
  brand: { bg: 'bg-brand-100', text: 'text-brand-600' },
  success: { bg: 'bg-success-100', text: 'text-success-600' },
  warning: { bg: 'bg-warning-100', text: 'text-warning-600' },
  danger: { bg: 'bg-danger-100', text: 'text-danger-600' },
};

export default function KpiCard({ icon: Icon, label, value, sublabel, sublabelTone = 'default', tone = 'brand' }) {
  const t = TONES[tone] || TONES.brand;
  const subColor =
    sublabelTone === 'success'
      ? 'text-success-600'
      : sublabelTone === 'danger'
      ? 'text-danger-600'
      : sublabelTone === 'warning'
      ? 'text-warning-600'
      : 'text-slate-400';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${t.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${t.text}`} />
        </div>
      </div>
      <p className="text-sm text-slate-500 mt-3">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sublabel && <p className={`text-xs font-medium mt-1 ${subColor}`}>{sublabel}</p>}
    </div>
  );
}
