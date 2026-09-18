import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { formatRelativeTime } from '../../utils/format';

function activityMeta(type) {
  switch (type) {
    case 'STOCK_IN':
      return { icon: ArrowUp, bg: 'bg-success-100', text: 'text-success-600', label: 'Stock In' };
    case 'SALE':
      return { icon: ArrowDown, bg: 'bg-brand-100', text: 'text-brand-600', label: 'Sale' };
    case 'STOCK_OUT':
    default:
      return { icon: ArrowDown, bg: 'bg-danger-100', text: 'text-danger-600', label: 'Stock Out' };
  }
}

export default function ActivityItem({ activity }) {
  const meta = activityMeta(activity.type);
  const Icon = meta.icon;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${meta.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">{meta.label}</p>
        <p className="text-sm text-slate-500 truncate">
          {activity.quantity} x {activity.productName}
        </p>
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap pt-0.5">{formatRelativeTime(activity.createdAt)}</span>
    </div>
  );
}
