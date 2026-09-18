import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Layers, AlertTriangle, XCircle } from 'lucide-react';
import { dashboardApi } from '../../services/dashboard';
import KpiCard from '../../components/dashboard/KpiCard';
import StockMovementChart from '../../components/dashboard/StockMovementChart';
import ActivityItem from '../../components/dashboard/ActivityItem';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    dashboardApi
      .get()
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (loading) return <Spinner label="Loading dashboard..." />;
  if (!data) return null;

  const { totals, stockMovement, recentActivities } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your stock and business</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3.5 py-2 self-start">
          {today}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Boxes}
          label="Total Products"
          value={totals.totalProducts}
          sublabel={totals.newProductsThisMonth > 0 ? `+${totals.newProductsThisMonth} this month` : 'No new items this month'}
          sublabelTone="success"
          tone="brand"
        />
        <KpiCard
          icon={Layers}
          label="Total Stock Quantity"
          value={totals.totalStock.toLocaleString('en-IN')}
          sublabel="Across all products"
          tone="success"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={totals.lowStock}
          sublabel={totals.lowStock > 0 ? 'Needs attention' : 'All good'}
          sublabelTone={totals.lowStock > 0 ? 'warning' : 'default'}
          tone="warning"
        />
        <KpiCard
          icon={XCircle}
          label="Out of Stock"
          value={totals.outOfStock}
          sublabel={totals.outOfStock > 0 ? 'Take action' : 'All stocked'}
          sublabelTone={totals.outOfStock > 0 ? 'danger' : 'default'}
          tone="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Stock Movement (Last 7 Days)</h2>
          <p className="text-sm text-slate-500 mb-2">Daily stock in vs. stock out</p>
          <StockMovementChart data={stockMovement} />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-900">Recent Activities</h2>
            <Link to="/reports?tab=stock-history" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View All
            </Link>
          </div>
          {recentActivities.length === 0 ? (
            <EmptyState title="No activity yet" message="Stock changes will show up here." />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivities.map((a) => (
                <ActivityItem key={a.id} activity={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
