import React from 'react';
import { ImageOff } from 'lucide-react';

export default function ProductThumb({ src, alt, size = 'w-10 h-10' }) {
  if (src) {
    return <img src={src} alt={alt} className={`${size} rounded-lg object-cover border border-slate-200`} />;
  }
  return (
    <div className={`${size} rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center`}>
      <ImageOff className="w-4 h-4 text-slate-300" />
    </div>
  );
}
