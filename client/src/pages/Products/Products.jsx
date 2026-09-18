import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Package, ChevronLeft, ChevronRight, RotateCcw, Archive } from 'lucide-react';
import { productsApi } from '../../services/products';
import { suppliersApi } from '../../services/suppliers';
import { formatCurrency } from '../../utils/format';
import StatusBadge from '../../components/ui/StatusBadge';
import ProductThumb from '../../components/products/ProductThumb';
import ProductFormModal from '../../components/products/ProductFormModal';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

const PAGE_SIZE = 8;

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteUsage, setDeleteUsage] = useState(null);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const toast = useToast();

  const loadProducts = useCallback(() => {
    setLoading(true);
    productsApi
      .list({ search: search || undefined, category, status })
      .then(setProducts)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, status]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    suppliersApi.list().then(setSuppliers).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== search) setSearch(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const pageItems = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAddModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }
  function openEditModal(product) {
    setEditingProduct(product);
    setModalOpen(true);
  }
  function handleSaved() {
    loadProducts();
  }

  async function handleDeleteClick(product) {
    setDeleteTarget(product);
    setCheckingUsage(true);
    setDeleteUsage(null);
    try {
      const usage = await productsApi.getUsage(product.id);
      setDeleteUsage(usage);
    } catch {
      setDeleteUsage({ has_references: false, bills_count: 0, stock_transactions_count: 0 });
    } finally {
      setCheckingUsage(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await productsApi.remove(deleteTarget.id);
      if (res.action === 'archived') {
        toast.info(res.message || 'Product has billing/stock history and was safely archived.');
      } else {
        toast.success(res.message || 'Product permanently deleted.');
      }
      setDeleteTarget(null);
      setDeleteUsage(null);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleRestore(product) {
    try {
      setRestoringId(product.id);
      const res = await productsApi.restore(product.id);
      toast.success(res.message || `"${product.name}" restored to active inventory.`);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your products</p>
        </div>
        <button className="btn-primary self-start" onClick={openAddModal}>
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchParams(e.target.value ? { search: e.target.value } : {});
            }}
          />
        </div>
        <select className="input sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="input sm:w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status (Active)</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
          <option value="archived">Inactive / Archived</option>
          <option value="all-including-archived">All (Including Archived)</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner label="Loading products..." />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            message="Try adjusting your filters, or add your first product."
            action={
              <button className="btn-primary" onClick={openAddModal}>
                <Plus className="w-4 h-4" /> Add Product
              </button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-left">
                    <th className="font-medium px-4 py-3 w-10">#</th>
                    <th className="font-medium px-4 py-3">Image</th>
                    <th className="font-medium px-4 py-3">Product Name</th>
                    <th className="font-medium px-4 py-3">Category</th>
                    <th className="font-medium px-4 py-3">SKU</th>
                    <th className="font-medium px-4 py-3 text-right">Stock</th>
                    <th className="font-medium px-4 py-3 text-right">Min. Stock</th>
                    <th className="font-medium px-4 py-3 text-right">Purchase</th>
                    <th className="font-medium px-4 py-3 text-right">Selling</th>
                    <th className="font-medium px-4 py-3">Status</th>
                    <th className="font-medium px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((p, i) => {
                    const isArchived = p.is_active === false || p.status === 'Archived';
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 ${isArchived ? 'bg-slate-50/60 opacity-85' : ''}`}>
                        <td className="px-4 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-3">
                          <ProductThumb src={p.image} alt={p.name} />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {p.name}
                          {isArchived && <span className="ml-2 text-xs font-normal text-slate-400">(Archived)</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.category}</td>
                        <td className="px-4 py-3 text-slate-500">{p.sku}</td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            p.current_stock === 0 ? 'text-danger-600' : 'text-slate-700'
                          }`}
                        >
                          {p.current_stock}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{p.minimum_stock}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(p.purchase_price)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(p.selling_price)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {isArchived ? (
                              <button
                                onClick={() => handleRestore(p)}
                                disabled={restoringId === p.id}
                                className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Restore Product"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteClick(p)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-danger-600 hover:bg-danger-50"
                                title="Delete / Archive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {pageItems.map((p) => {
                const isArchived = p.is_active === false || p.status === 'Archived';
                return (
                  <div key={p.id} className={`p-4 flex gap-3 ${isArchived ? 'bg-slate-50/60 opacity-85' : ''}`}>
                    <ProductThumb src={p.image} alt={p.name} size="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-800">
                            {p.name}
                            {isArchived && <span className="ml-1 text-xs text-slate-400">(Archived)</span>}
                          </p>
                          <p className="text-xs text-slate-500">
                            {p.sku} · {p.category}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-slate-500">
                          Stock: <span className="font-medium text-slate-700">{p.current_stock}</span>
                        </span>
                        <span className="font-medium text-slate-700">{formatCurrency(p.selling_price)}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => openEditModal(p)} className="btn-secondary flex-1 !py-1.5 text-xs">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        {isArchived ? (
                          <button
                            onClick={() => handleRestore(p)}
                            disabled={restoringId === p.id}
                            className="btn-secondary flex-1 !py-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteClick(p)}
                            className="btn-secondary flex-1 !py-1.5 text-xs text-danger-600 border-danger-200 hover:bg-danger-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages} · {products.length} products
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary !px-2.5 !py-1.5"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-secondary !px-2.5 !py-1.5"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        product={editingProduct}
        suppliers={suppliers}
      />

      {/* Delete / Archive Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteUsage(null);
          }
        }}
        title={
          checkingUsage
            ? 'Checking Product Usage...'
            : deleteUsage?.has_references
            ? 'Cannot Permanently Delete (Archive Product)'
            : 'Delete Product'
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {checkingUsage ? (
            <div className="py-6 flex justify-center">
              <Spinner label="Checking billing and transaction history..." />
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <div
                  className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${
                    deleteUsage?.has_references ? 'bg-amber-100 text-amber-600' : 'bg-danger-100 text-danger-600'
                  }`}
                >
                  {deleteUsage?.has_references ? <Archive className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                </div>
                <div className="space-y-2 flex-1">
                  <p className="font-semibold text-slate-800">{deleteTarget?.name}</p>
                  {deleteUsage?.has_references ? (
                    <div className="text-sm text-slate-600 space-y-2">
                      <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs">
                        <strong>Cannot permanently delete:</strong> This product is referenced in{' '}
                        <strong>{deleteUsage.bills_count} bill item(s)</strong>
                        {deleteUsage.stock_transactions_count > 0 && (
                          <> and <strong>{deleteUsage.stock_transactions_count} stock record(s)</strong></>
                        )}.
                      </p>
                      <p>
                        To protect your accounting and tax history, this product will be <strong>safely archived</strong> instead of permanently deleted.
                      </p>
                      <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1">
                        <li>It will disappear from the active product list and billing search.</li>
                        <li>It will remain intact on all past invoices, GST reports, and stock logs.</li>
                        <li>You can view and restore it anytime using the "Inactive / Archived" filter.</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>
                        Are you sure you want to permanently delete <strong>"{deleteTarget?.name}"</strong>?
                      </p>
                      <p className="text-xs text-slate-500">
                        This product has no billing history and cannot be recovered once deleted.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteUsage(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={deleteUsage?.has_references ? 'btn-primary' : 'btn-danger'}
                  disabled={deleting}
                  onClick={confirmDelete}
                >
                  {deleting ? 'Processing...' : deleteUsage?.has_references ? 'Archive Product' : 'Delete Permanently'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
