// Utility Helper Functions

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0.00";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs. ${formatted}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Generates a mock barcode representation
export const getBarcodeLines = (text) => {
  // Generate a deterministic array of thin/medium/thick line widths based on text characters
  const defaultPattern = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1];
  if (!text) return defaultPattern;
  
  const pattern = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // map charCode to values between 1 and 4
    pattern.push((charCode % 4) + 1);
    pattern.push(1); // spacer
  }
  return pattern.slice(0, 24); // Cap line count
};
