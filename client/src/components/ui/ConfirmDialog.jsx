import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-danger-100' : 'bg-brand-100'}`}>
          <AlertTriangle className={`w-5 h-5 ${danger ? 'text-danger-600' : 'text-brand-600'}`} />
        </div>
        <p className="text-sm text-slate-600 pt-1.5">{message}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
