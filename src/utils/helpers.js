/**
 * Resolves saree image paths safely regardless of whether the site is hosted
 * on a subdirectory (GitHub Pages) or a custom domain.
 */
export const getImagePath = (image) => {
  if (!image) return '';
  
  // If it's a external link or a base64 string, return it as is
  if (image.startsWith('http') || image.startsWith('data:')) {
    return image;
  }
  
  // Clean any leading slash from the path
  const cleanPath = image.startsWith('/') ? image.substring(1) : image;
  
  // Combine with Vite's base URL (e.g. /loom-and-ink/)
  return `${import.meta.env.BASE_URL}${cleanPath}`;
};

/**
 * Converts a price in INR to the target currency using exchange rates
 * and formats it using the browser's Intl formatting.
 */
export const formatCurrency = (priceStr, targetCurrency = 'INR', exchangeRates = { INR: 1 }, isForSale = false) => {
  if (!priceStr) return '';

  // Parse numeric value from string (e.g. "5,000" -> 5000)
  const numericPrice = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  if (isNaN(numericPrice)) return priceStr;

  // Fetch exchange rate (default to 1 if base INR)
  const rate = exchangeRates[targetCurrency] || (targetCurrency === 'INR' ? 1 : null);

  // If we don't have the rate, fallback to showing original INR
  if (rate === null) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(numericPrice);
  }

  // Convert base price
  let converted = numericPrice * rate;

  // For non-India audience, inflate cost price of items for sale (not sold) by $8 USD equivalent
  if (targetCurrency !== 'INR' && isForSale) {
    const usdRate = exchangeRates['USD'] || (targetCurrency === 'USD' ? rate : 0.012);
    const markupInTargetCurrency = 8 * (rate / usdRate);
    converted += markupInTargetCurrency;
  }

  // For US audience, ensure the value shown in dollars is rounded to the nearest multiple of 5
  if (targetCurrency === 'USD') {
    converted = Math.max(5, Math.round(converted / 5) * 5);
  }

  // Format currency
  let locale = 'en-US';
  if (targetCurrency === 'INR') locale = 'en-IN';
  else if (targetCurrency === 'CAD') locale = 'en-CA';
  else if (targetCurrency === 'GBP') locale = 'en-GB';
  else if (targetCurrency === 'EUR') locale = 'en-IE';
  else if (targetCurrency === 'AUD') locale = 'en-AU';
  else if (targetCurrency === 'SGD') locale = 'en-SG';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: targetCurrency,
      maximumFractionDigits: 0
    }).format(converted);
  } catch (e) {
    return `${targetCurrency} ${Math.round(converted)}`;
  }
};
