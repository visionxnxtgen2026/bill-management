import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import StockIn from './pages/StockIn/StockIn';
import StockOut from './pages/StockOut/StockOut';
import Billing from './pages/Billing/Billing';
import Invoice from './pages/Billing/Invoice';
import Reports from './pages/Reports/Reports';
import Suppliers from './pages/Suppliers/Suppliers';
import Settings from './pages/Settings/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/stock-in" element={<StockIn />} />
        <Route path="/stock-out" element={<StockOut />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/billing/:id/invoice" element={<Invoice />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
