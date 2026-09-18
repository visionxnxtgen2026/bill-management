import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { reportsApi } from '../../services/reports';
import { exportToCsv } from '../../utils/csv';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function StockSummaryTab() {
  const [startDate, setStartDate] = useState(thirtyDaysAgo());
  const [endDate, setEndDate] = useState(todayISO());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  function load() {
    setLoading(true);
    reportsApi
      .stockSummary({ start_date: startDate, end_date: endDate })
      .then((res) => setRows(res.rows))
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
        <button className="btn-secondary" onClick={() => exportToCsv('stock-summary.csv', rows)} disabled={rows.length === 0}>
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No data" message="No stock activity in this range." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="font-medium px-3 py-2.5 w-10">#</th>
                <th className="font-medium px-3 py-2.5">Product</th>
                <th className="font-medium px-3 py-2.5">Category</th>
                <th className="font-medium px-3 py-2.5 text-right">Opening Stock</th>
                <th className="font-medium px-3 py-2.5 text-right">Stock In</th>
                <th className="font-medium px-3 py-2.5 text-right">Stock Out</th>
                <th className="font-medium px-3 py-2.5 text-right">Closing Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="px-3 py-2.5 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{r.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.category}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{r.opening_stock}</td>
                  <td className="px-3 py-2.5 text-right text-success-600">{r.stock_in}</td>
                  <td className="px-3 py-2.5 text-right text-danger-600">{r.stock_out}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-800">{r.closing_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
