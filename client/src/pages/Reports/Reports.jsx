import React from 'react';
import { useSearchParams } from 'react-router-dom';
import StockSummaryTab from './StockSummaryTab';
import StockHistoryTab from './StockHistoryTab';
import LowStockTab from './LowStockTab';
import OutOfStockTab from './OutOfStockTab';
import SalesTab from './SalesTab';

const TABS = [
  { key: 'stock-summary', label: 'Stock Summary', Component: StockSummaryTab },
  { key: 'stock-history', label: 'Stock History', Component: StockHistoryTab },
  { key: 'low-stock', label: 'Low Stock', Component: LowStockTab },
  { key: 'out-of-stock', label: 'Out of Stock', Component: OutOfStockTab },
  { key: 'sales', label: 'Sales', Component: SalesTab },
];

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'stock-summary';
  const Active = TABS.find((t) => t.key === activeTab).Component;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">View stock reports and analytics</p>
      </div>

      <div className="border-b border-slate-200 mb-5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSearchParams({ tab: t.key })}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <Active />
      </div>
    </div>
  );
}
