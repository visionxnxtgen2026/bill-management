import React, { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import Modal from '../ui/Modal';
import { productsApi } from '../../services/products';
import { useToast } from '../ui/Toast';

const CATEGORIES = ['Stationery', 'Office', 'Electronics', 'Grocery', 'Hardware', 'Other'];
const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'ream', 'pack'];

const EMPTY_FORM = {
  name: '',
  category: '',
  sku: '',
  unit: 'pcs',
  purchase_price: '',
  selling_price: '',
  current_stock: '',
  minimum_stock: '',
  supplier_id: '',
  image: '',
  notes: '',
};

export default function ProductFormModal({ open, onClose, onSaved, product, suppliers }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();
  const isEdit = Boolean(product);

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name || '',
              category: product.category || '',
              sku: product.sku || '',
              unit: product.unit || 'pcs',
              purchase_price: product.purchase_price ?? '',
              selling_price: product.selling_price ?? '',
              current_stock: '',
              minimum_stock: product.minimum_stock ?? '',
              supplier_id: product.supplier_id || '',
              image: product.image || '',
              notes: product.notes || '',
            }
          : EMPTY_FORM
      );
      setErrors({});
    }
  }, [open, product]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.category.trim()) errs.category = 'Category is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    if (form.purchase_price === '' || Number(form.purchase_price) < 0) errs.purchase_price = 'Enter a valid price';
    if (form.selling_price === '' || Number(form.selling_price) < 0) errs.selling_price = 'Enter a valid price';
    if (form.minimum_stock === '' || Number(form.minimum_stock) < 0) errs.minimum_stock = 'Enter a valid quantity';
    if (form.current_stock !== '' && Number(form.current_stock) < 0) errs.current_stock = 'Cannot be negative';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Image is too large. Please choose a file under 1.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update('image', reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        purchase_price: Number(form.purchase_price),
        selling_price: Number(form.selling_price),
        minimum_stock: Number(form.minimum_stock),
        current_stock: form.current_stock === '' ? undefined : Number(form.current_stock),
        supplier_id: form.supplier_id || null,
      };

      const saved = isEdit ? await productsApi.update(product.id, payload) : await productsApi.create(payload);
      toast.success(isEdit ? 'Product updated successfully.' : 'Product added successfully.');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Product' : 'Add New Product'}
      subtitle={isEdit ? 'Update product details' : 'Add a new product to your inventory'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Product Name *</label>
            <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Notebook" />
            {errors.name && <p className="text-xs text-danger-600 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="label">Category *</label>
            <input
              className="input"
              list="category-options"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="e.g. Stationery"
            />
            <datalist id="category-options">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.category && <p className="text-xs text-danger-600 mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="label">SKU / Product ID *</label>
            <input
              className="input uppercase"
              value={form.sku}
              onChange={(e) => update('sku', e.target.value)}
              placeholder="e.g. NBK001"
              disabled={isEdit}
            />
            {errors.sku && <p className="text-xs text-danger-600 mt-1">{errors.sku}</p>}
          </div>
          <div>
            <label className="label">Unit *</label>
            <select className="input" value={form.unit} onChange={(e) => update('unit', e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Purchase Price (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.purchase_price}
              onChange={(e) => update('purchase_price', e.target.value)}
              placeholder="0.00"
            />
            {errors.purchase_price && <p className="text-xs text-danger-600 mt-1">{errors.purchase_price}</p>}
          </div>
          <div>
            <label className="label">Selling Price (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.selling_price}
              onChange={(e) => update('selling_price', e.target.value)}
              placeholder="0.00"
            />
            {errors.selling_price && <p className="text-xs text-danger-600 mt-1">{errors.selling_price}</p>}
          </div>

          <div>
            <label className="label">Minimum Stock Level *</label>
            <input
              type="number"
              min="0"
              className="input"
              value={form.minimum_stock}
              onChange={(e) => update('minimum_stock', e.target.value)}
              placeholder="e.g. 10"
            />
            {errors.minimum_stock && <p className="text-xs text-danger-600 mt-1">{errors.minimum_stock}</p>}
          </div>
          <div>
            <label className="label">{isEdit ? 'Adjust stock separately' : 'Opening Stock'}</label>
            <input
              type="number"
              min="0"
              className="input disabled:bg-slate-100"
              value={form.current_stock}
              onChange={(e) => update('current_stock', e.target.value)}
              placeholder="0"
              disabled={isEdit}
            />
            {errors.current_stock && <p className="text-xs text-danger-600 mt-1">{errors.current_stock}</p>}
            {isEdit && <p className="text-xs text-slate-400 mt-1">Use Stock In / Stock Out to change quantity.</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="label">Supplier</label>
            <select className="input" value={form.supplier_id} onChange={(e) => update('supplier_id', e.target.value)}>
              <option value="">Select supplier (optional)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Product Image (optional)</label>
            {form.image ? (
              <div className="relative w-20 h-20">
                <img src={form.image} alt="Product" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                <button
                  type="button"
                  onClick={() => update('image', '')}
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-0.5 shadow"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-300 rounded-lg py-5 cursor-pointer hover:border-brand-400 hover:bg-slate-50 transition-colors">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-500">Drag & drop or click to upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
