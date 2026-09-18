import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { suppliersApi } from '../../services/suppliers';
import { formatDate } from '../../utils/format';
import Spinner from '../ui/Spinner';
import { useToast } from '../ui/Toast';

export default function SupplierDetailsModal({ open, onClose, supplierId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (open && supplierId) {
      setLoading(true);
      suppliersApi
        .get(supplierId)
        .then(setData)
        .catch((err) => toast.error(err.message))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplierId]);

  return (
    <Modal open={open} onClose={onClose} title={data?.name || 'Supplier Details'} maxWidth="max-w-xl">
      {loading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Phone</p>
              <p className="text-slate-700">{data.phone || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400">Email</p>
              <p className="text-slate-700">{data.email || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400">Address</p>
              <p className="text-slate-700">{data.address || '—'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Products ({data.products.length})</h3>
            {data.products.length === 0 ? (
              <p className="text-sm text-slate-400">No products linked to this supplier.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {data.products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-700">{p.name}</span>
                    <span className="text-slate-500">Stock: {p.current_stock}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Purchase History</h3>
            {data.purchaseHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No stock-in records yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {data.purchaseHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-700">{h.product_name}</span>
                    <span className="text-slate-500">
                      +{h.quantity} · {formatDate(h.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
