import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StockMovementChart({ data }) {
  const chartData = data.map((d) => ({
    day: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    'Stock In': d.stockIn,
    'Stock Out': d.stockOut,
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
            cursor={{ fill: '#F8FAFC' }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} iconType="circle" />
          <Bar dataKey="Stock In" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Stock Out" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
