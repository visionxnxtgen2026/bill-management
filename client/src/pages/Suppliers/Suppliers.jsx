import React, { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Truck, Eye } from 'lucide-react';
import { suppliersApi } from '../../services/suppliers';
import SupplierFormModal from '../../components/suppliers/SupplierFormModal';
import SupplierDetailsModal from '../../components/suppliers/SupplierDetailsModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const toast = useToast();

  function load() {
    setLoading(true);
    suppliersApi
      .list({ search: search || undefined })
      .then(setSuppliers)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function confirmDelete() {
    try {
      await suppliersApi.remove(deleteTarget.id);
      toast.success('Supplier deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your suppliers</p>
        </div>
        <button
          className="btn-primary self-start"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner label="Loading suppliers..." />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No suppliers found"
            action={
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Add Supplier
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left">
                  <th className="font-medium px-4 py-3">Name</th>
                  <th className="font-medium px-4 py-3">Phone</th>
                  <th className="font-medium px-4 py-3">Email</th>
                  <th className="font-medium px-4 py-3">Address</th>
                  <th className="font-medium px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{s.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{s.address || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetailsId(s.id)} className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditing(s);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-md text-slate-400 hover:text-danger-600 hover:bg-danger-50" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SupplierFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} supplier={editing} />
      <SupplierDetailsModal open={Boolean(detailsId)} onClose={() => setDetailsId(null)} supplierId={detailsId} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Products linked to this supplier will keep their supplier field empty.`}
      />
    </div>
  );
}
