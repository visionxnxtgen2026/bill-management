export function formatCurrency(value) {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(value) {
  if (!value) return '—';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

export function numberToWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertSection(n) {
    let str = '';
    if (n >= 100) {
      str += `${ones[Math.floor(n / 100)]} Hundred `;
      n %= 100;
    }
    if (n >= 20) {
      str += `${tens[Math.floor(n / 10)]} `;
      n %= 10;
    }
    if (n > 0) {
      str += `${ones[n]} `;
    }
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  let hundred = remainder;

  let words = '';
  if (crore > 0) words += `${convertSection(crore)} Crore `;
  if (lakh > 0) words += `${convertSection(lakh)} Lakh `;
  if (thousand > 0) words += `${convertSection(thousand)} Thousand `;
  if (hundred > 0) words += `${convertSection(hundred)} `;

  return `Rupees ${words.trim()} Only`;
}

export function statusBadgeClass(status) {
  switch (status) {
    case 'In Stock':
      return 'badge-success';
    case 'Low Stock':
      return 'badge-warning';
    case 'Out of Stock':
      return 'badge-danger';
    case 'Archived':
    case 'Inactive':
      return 'badge-muted';
    default:
      return 'badge-info';
  }
}
