import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  BarChart3,
  Truck,
  Settings as SettingsIcon,
  Boxes,
  LogOut,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/stock-in', label: 'Stock In', icon: ArrowDownToLine },
  { to: '/stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-navy-900 text-slate-300 flex flex-col shrink-0 transform transition-transform duration-200 lg:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Boxes className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">StockPro</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-navy-700 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-navy-800 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
}
