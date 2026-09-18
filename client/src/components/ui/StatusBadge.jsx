import React from 'react';
import { statusBadgeClass } from '../../utils/format';

export default function StatusBadge({ status }) {
  return <span className={statusBadgeClass(status)}>{status}</span>;
}
