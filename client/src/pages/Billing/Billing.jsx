import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Receipt, Search, Phone, CreditCard, ShieldCheck } from 'lucide-react';
import { productsApi } from '../../services/products';
import { billsApi } from '../../services/bills';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Credit / Due'];

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isInterstate, setIsInterstate] = useState(false);
  const [discount, setDiscount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    productsApi.list().then(setProducts).catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, products]);

  function addToCart(product) {
    if (product.current_stock <= 0) {
      toast.error(`${product.name} is out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          toast.error(`Only ${product.current_stock} unit(s) of "${product.name}" available.`);
          return prev;
        }
        return prev.map((c) => (c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          hsn_code: product.hsn_code || '8473',
          gst_rate: product.gst_rate !== undefined ? Number(product.gst_rate) : 18,
          price: Number(product.selling_price),
          quantity: 1,
          stock: product.current_stock,
        },
      ];
    });
    setQuery('');
    setShowResults(false);
  }

  function updateQty(productId, qty) {
    const item = cart.find((c) => c.product_id === productId);
    if (!item) return;
    const clamped = Math.max(1, Math.min(qty, item.stock));
    setCart((prev) => prev.map((c) => (c.product_id === productId ? { ...c, quantity: clamped } : c)));
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  }

  function clearCart() {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMethod('Cash');
    setIsInterstate(false);
    setDiscount('');
  }

  // Calculations
  const rawSubtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const discountAmount = Math.min(Number(discount) || 0, rawSubtotal);
  const taxableAmount = Math.max(0, rawSubtotal - discountAmount);

  // Dynamic GST calculation preview
  const estimatedGst = cart.reduce((sum, c) => {
    const itemRatio = rawSubtotal > 0 ? (c.price * c.quantity) / rawSubtotal : 0;
    const itemTaxable = taxableAmount * itemRatio;
    const rate = c.gst_rate || 18;
    return sum + (itemTaxable * rate) / 100;
  }, 0);

  const grandTotal = Math.round(taxableAmount + estimatedGst);

  async function handleGenerateBill() {
    if (cart.length === 0) {
      toast.error('Add at least one product to the bill.');
      return;
    }
    setSubmitting(true);
    try {
      const bill = await billsApi.create({
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        payment_method: paymentMethod,
        is_interstate: isInterstate,
        discount: discountAmount,
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.quantity,
          price: c.price,
          hsn_code: c.hsn_code,
          gst_rate: c.gst_rate,
        })),
      });
      toast.success(`GST Invoice ${bill.invoice_number} generated.`);
      clearCart();
      navigate(`/billing/${bill.id}/invoice`);
    } catch (err) {
      toast.error(err.message);
      productsApi.list().then(setProducts);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Bill</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate GST TAX Invoice and update stock inventory</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 self-start">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>GST Ready · G - TECHNOLOGIES</span>
        </div>
      </div>

      <div className="card p-5 space-y-5">
        {/* Customer & Product Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="relative md:col-span-6">
            <label className="label">Search & Add Product / Service</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search by name, SKU or model..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 180)}
              />
            </div>
            {showResults && matches.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {matches.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onMouseDown={() => addToCart(p)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-50 text-sm border-b border-slate-100 last:border-b-0"
                  >
                    <div>
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-400 block">
                        SKU: {p.sku} {p.hsn_code ? `· HSN: ${p.hsn_code}` : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800">{formatCurrency(p.selling_price)}</span>
                      <span className={`text-xs block ${p.current_stock <= 5 ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                        Stock: {p.current_stock}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="label">Customer Name</label>
            <input
              className="input"
              placeholder="Walk-in Customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <label className="label">Customer Phone (optional)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Mobile number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Additional Invoice Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
          <div>
            <label className="label">Payment Method</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="input pl-9"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInterstate}
                onChange={(e) => setIsInterstate(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="font-medium">Inter-State Sale (Apply IGST instead of CGST+SGST)</span>
            </label>
          </div>
        </div>

        {/* Cart Item Table */}
        {cart.length === 0 ? (
          <EmptyState icon={Receipt} title="Cart is empty" message="Search and add products to start generating a GST bill." />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-left border-y border-slate-200">
                  <th className="font-semibold px-3 py-2.5">Product / Item</th>
                  <th className="font-semibold px-3 py-2.5 text-center">HSN/SAC</th>
                  <th className="font-semibold px-3 py-2.5 w-28 text-center">Qty</th>
                  <th className="font-semibold px-3 py-2.5 text-right">Rate</th>
                  <th className="font-semibold px-3 py-2.5 text-center">GST %</th>
                  <th className="font-semibold px-3 py-2.5 text-right">Total</th>
                  <th className="font-semibold px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((c) => (
                  <tr key={c.product_id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-3 font-medium text-slate-800">
                      <div>{c.name}</div>
                      <div className="text-xs text-slate-400 font-normal">SKU: {c.sku}</div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-slate-500 font-mono">
                      {c.hsn_code || '8473'}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="1"
                        max={c.stock}
                        value={c.quantity}
                        onChange={(e) => updateQty(c.product_id, Number(e.target.value))}
                        className="w-20 mx-auto block text-center rounded-md border border-slate-300 py-1 text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600 font-medium">{formatCurrency(c.price)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {c.gst_rate || 18}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">{formatCurrency(c.price * c.quantity)}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => removeFromCart(c.product_id)}
                        className="text-slate-400 hover:text-danger-600 p-1 rounded hover:bg-danger-50 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary */}
        <div className="flex flex-col items-end gap-2 mt-5 pt-4 border-t border-slate-200">
          <div className="w-full sm:w-80 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal</span>
              <span className="font-semibold text-slate-800">{formatCurrency(rawSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Discount (₹)</span>
              <input
                type="number"
                min="0"
                max={rawSubtotal}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-28 text-right rounded-md border border-slate-300 py-1 px-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
              <span>Taxable Value</span>
              <span className="font-semibold text-slate-800">{formatCurrency(taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                {isInterstate ? 'Estimated IGST' : 'Estimated CGST + SGST'}
              </span>
              <span className="font-medium">{formatCurrency(estimatedGst)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t-2 border-slate-900">
              <span>Grand Total</span>
              <span className="text-brand-700">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
          <button className="btn-secondary" onClick={clearCart}>
            Clear Cart
          </button>
          <button
            className="btn-primary px-6"
            onClick={handleGenerateBill}
            disabled={submitting || cart.length === 0}
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Generating GST Invoice...' : 'Generate Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}
