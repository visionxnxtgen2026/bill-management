import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
