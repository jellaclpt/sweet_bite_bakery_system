export const getImageUrl = (imagePath) => {
  // Fall back to the bakery logo, which ships with the app (the old /placeholder.png did not exist)
  if (!imagePath) return `${process.env.PUBLIC_URL || ''}/logo192.png`;

  // If it's already a full URL, return it unchanged
  if (imagePath.startsWith('http')) return imagePath;

  // Determine backend base URL from env (CRA) or fallback to current origin
  const apiBase = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/+$/, '')) || window.location.origin;

  // Ensure no leading slash duplication
  const cleaned = imagePath.replace(/^\/+/, '');

  return `${apiBase}/${cleaned}`;
};
