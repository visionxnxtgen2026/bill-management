import React, { useEffect, useMemo, useState } from 'react';
import { stockApi } from '../../services/stock';
import { productsApi } from '../../services/products';
import { formatDateTime } from '../../utils/format';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

const TYPE_BADGE = {
  STOCK_IN: 'badge-success',
  STOCK_OUT: 'badge-danger',
  SALE: 'badge-info',
};
const TYPE_LABEL = {
  STOCK_IN: 'Stock In',
  STOCK_OUT: 'Stock Out',
  SALE: 'Sale',
};

export default function StockHistoryTab() {
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    productsApi.list().then(setProducts).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    stockApi
      .history({
        product_id: productId || undefined,
        type,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
      .then(setHistory)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => history, [history]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="label">Product</label>
          <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="STOCK_IN">Stock In</option>
            <option value="STOCK_OUT">Stock Out</option>
            <option value="SALE">Sale</option>
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={load}>
          Apply
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No transactions found" message="Try adjusting your filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="font-medium px-3 py-2.5">Date</th>
                <th className="font-medium px-3 py-2.5">Product</th>
                <th className="font-medium px-3 py-2.5">Type</th>
                <th className="font-medium px-3 py-2.5 text-right">Quantity</th>
                <th className="font-medium px-3 py-2.5 text-right">Previous</th>
                <th className="font-medium px-3 py-2.5 text-right">New</th>
                <th className="font-medium px-3 py-2.5">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDateTime(h.created_at)}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">
                    {h.product_name} <span className="text-slate-400 font-normal">({h.sku})</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={TYPE_BADGE[h.type]}>{TYPE_LABEL[h.type]}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{h.quantity}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{h.previous_stock}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{h.new_stock}</td>
                  <td className="px-3 py-2.5 text-slate-500">{h.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
