import React from 'react';

export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
      )}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {message && <p className="text-sm text-slate-500 max-w-sm">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
