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
