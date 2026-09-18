import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';
import { reportsApi } from '../../services/reports';

export default function Header({ onMenuClick }) {
  const [query, setQuery] = useState('');
  const [alertCount, setAlertCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    Promise.all([reportsApi.lowStock(), reportsApi.outOfStock()])
      .then(([low, out]) => {
        if (mounted) setAlertCount(low.length + out.length);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    navigate(query.trim() ? `/products?search=${encodeURIComponent(query.trim())}` : '/products');
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 print:hidden">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button onClick={onMenuClick} className="lg:hidden text-slate-500 hover:text-slate-700 p-1 -ml-1">
          <Menu className="w-5 h-5" />
        </button>
        <form onSubmit={handleSearch} className="relative flex-1 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search product, category..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:bg-white"
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/reports?tab=low-stock')}
          className="relative text-slate-500 hover:text-slate-700"
          title={`${alertCount} stock alert(s)`}
        >
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-semibold">
          A
        </div>
      </div>
    </header>
  );
}
