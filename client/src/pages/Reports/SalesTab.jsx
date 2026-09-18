import React, { useEffect, useState } from 'react';
import { reportsApi } from '../../services/reports';
import { formatCurrency, formatDate } from '../../utils/format';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function SalesTab() {
  const [startDate, setStartDate] = useState(thirtyDaysAgo());
  const [endDate, setEndDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  function load() {
    setLoading(true);
    reportsApi
      .sales({ start_date: startDate, end_date: endDate })
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={load}>
          Generate
        </button>
      </div>

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-slate-500">Total Sales</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.totalSales)}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">Bills Generated</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.billCount}</p>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-slate-700 mb-2">Top Products</h3>
          {data.topProducts.length === 0 ? (
            <EmptyState title="No sales in this range" />
          ) : (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-left">
                    <th className="font-medium px-3 py-2.5">Product</th>
                    <th className="font-medium px-3 py-2.5 text-right">Units Sold</th>
                    <th className="font-medium px-3 py-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topProducts.map((p) => (
                    <tr key={p.name}>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{p.name}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{p.units_sold}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="text-sm font-semibold text-slate-700 mb-2">Daily Sales</h3>
          {data.dailySales.length === 0 ? (
            <EmptyState title="No sales in this range" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-left">
                    <th className="font-medium px-3 py-2.5">Date</th>
                    <th className="font-medium px-3 py-2.5 text-right">Bills</th>
                    <th className="font-medium px-3 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.dailySales.map((d) => (
                    <tr key={d.date}>
                      <td className="px-3 py-2.5 text-slate-600">{formatDate(d.date)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{d.bill_count}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-800">{formatCurrency(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
