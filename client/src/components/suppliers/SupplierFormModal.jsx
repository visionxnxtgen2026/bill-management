import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { suppliersApi } from '../../services/suppliers';
import { useToast } from '../ui/Toast';

const EMPTY = { name: '', phone: '', email: '', address: '', notes: '' };

export default function SupplierFormModal({ open, onClose, onSaved, supplier }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const isEdit = Boolean(supplier);

  useEffect(() => {
    if (open) {
      setForm(
        supplier
          ? {
              name: supplier.name || '',
              phone: supplier.phone || '',
              email: supplier.email || '',
              address: supplier.address || '',
              notes: supplier.notes || '',
            }
          : EMPTY
      );
      setErrors({});
    }
  }, [open, supplier]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Supplier name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = isEdit ? await suppliersApi.update(supplier.id, form) : await suppliersApi.create(form);
      toast.success(isEdit ? 'Supplier updated.' : 'Supplier added.');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Supplier' : 'Add Supplier'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Supplier Name *</label>
          <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Sri Balaji Stationers" />
          {errors.name && <p className="text-xs text-danger-600 mt-1">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="9840012345" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="contact@example.com" />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
