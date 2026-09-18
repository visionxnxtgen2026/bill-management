import React, { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { reportsApi } from '../../services/reports';
import { exportToCsv } from '../../utils/csv';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

export default function LowStockTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    reportsApi
      .lowStock()
      .then(setRows)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-secondary" onClick={() => exportToCsv('low-stock.csv', filtered)} disabled={filtered.length === 0}>
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No low stock items" message="Everything is sufficiently stocked." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="font-medium px-3 py-2.5">Product</th>
                <th className="font-medium px-3 py-2.5">SKU</th>
                <th className="font-medium px-3 py-2.5">Category</th>
                <th className="font-medium px-3 py-2.5 text-right">Current Stock</th>
                <th className="font-medium px-3 py-2.5 text-right">Minimum Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{r.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.sku}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.category}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-warning-600">{r.current_stock}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{r.minimum_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
