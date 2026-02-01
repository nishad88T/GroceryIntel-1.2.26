export const CURRENCY_SYMBOLS = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
  NZD: 'NZ$',
  JPY: '¥',
  CNY: '¥',
};

export const formatCurrency = (amount, currencyCode = 'GBP') => {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || '£';
  const value = typeof amount === 'number' ? Math.abs(amount).toFixed(2) : '0.00';
  const isNegative = typeof amount === 'number' && amount < 0;
  return isNegative ? `-${symbol}${value}` : `${symbol}${value}`;
};