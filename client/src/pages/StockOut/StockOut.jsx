import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpFromLine } from 'lucide-react';
import { productsApi } from '../../services/products';
import { stockApi } from '../../services/stock';
import { useToast } from '../../components/ui/Toast';

const REASONS = ['Sale', 'Damaged', 'Lost', 'Internal Use', 'Other'];
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function StockOut() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Sale');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    productsApi.list().then(setProducts).catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = useMemo(() => products.find((p) => String(p.id) === String(productId)), [products, productId]);
  const exceedsStock = selectedProduct && quantity !== '' && Number(quantity) > selectedProduct.current_stock;
  const newStockPreview =
    selectedProduct && quantity !== '' && Number(quantity) > 0 && !exceedsStock
      ? selectedProduct.current_stock - Number(quantity)
      : null;

  function resetForm() {
    setProductId('');
    setQuantity('');
    setReason('Sale');
    setDate(todayISO());
    setNotes('');
    setErrors({});
  }

  function validate() {
    const errs = {};
    if (!productId) errs.productId = 'Select a product';
    if (!quantity || Number(quantity) <= 0) errs.quantity = 'Enter a quantity greater than 0';
    else if (selectedProduct && Number(quantity) > selectedProduct.current_stock) {
      errs.quantity = `Only ${selectedProduct.current_stock} unit(s) available`;
    }
    if (!reason) errs.reason = 'Select a reason';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const result = await stockApi.stockOut({
        product_id: Number(productId),
        quantity: Number(quantity),
        reason,
        date,
        notes: notes || undefined,
      });
      toast.success(
        `Stock removed: ${result.transaction.previous_stock} → ${result.transaction.new_stock} for ${selectedProduct?.name}.`
      );
      resetForm();
      productsApi.list().then(setProducts);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Stock Out</h1>
        <p className="text-sm text-slate-500 mt-0.5">Remove stock from inventory</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Product *</label>
            <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Stock: {p.current_stock}
                </option>
              ))}
            </select>
            {errors.productId && <p className="text-xs text-danger-600 mt-1">{errors.productId}</p>}
          </div>

          <div>
            <label className="label">Quantity *</label>
            <input
              type="number"
              min="1"
              className="input"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {errors.quantity && <p className="text-xs text-danger-600 mt-1">{errors.quantity}</p>}
          </div>

          <div>
            <label className="label">Reason *</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Notes (Optional)</label>
            <textarea className="input" rows={2} placeholder="Enter notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {exceedsStock && (
          <div className="bg-danger-50 border border-danger-100 rounded-lg px-4 py-3 text-sm text-danger-700">
            Only {selectedProduct.current_stock} unit(s) of "{selectedProduct.name}" available.
          </div>
        )}
        {newStockPreview !== null && (
          <div className="flex items-center gap-2 bg-danger-50 border border-danger-100 rounded-lg px-4 py-3 text-sm">
            <span className="text-slate-600">
              {selectedProduct.name}: {selectedProduct.current_stock} → <span className="font-semibold text-danger-700">{newStockPreview}</span>
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" className="btn-secondary" onClick={resetForm}>
            Cancel
          </button>
          <button type="submit" className="btn-danger" disabled={saving || exceedsStock}>
            <ArrowUpFromLine className="w-4 h-4" />
            {saving ? 'Removing...' : 'Remove Stock'}
          </button>
        </div>
      </form>
    </div>
  );
}
