import { apiUrl } from "@/url";

/**
 * Build a browser-accessible image URL.
 *
 * DB stores: "uploads/xyz.jpg"
 * Returns:   "https://oms.seerweberp.com/api/uploads/xyz.jpg"
 */

export function getImageUrl(imagePath: string | null | undefined): string | null {

  if (!imagePath) return null;

  // If already full URL, return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Remove leading slash if exists
  const cleanPath = imagePath.replace(/^\/+/, "");

  // Remove trailing slash from apiUrl
  const base = apiUrl.replace(/\/$/, "");

  // ✅ FINAL CORRECT URL
  return `${base}/${cleanPath}`;
}

// Add this new helper alongside your existing getImageUrl
export function getProxiedImageUrl(imagePath: string | null | undefined): string | null {
  const directUrl = getImageUrl(imagePath);
  if (!directUrl) return null;
  
  // Route through your CI proxy to avoid CORS in PDF generation
  const base = apiUrl.replace(/\/$/, "");
  return `${base}/products/proxy-image?url=${encodeURIComponent(directUrl)}`;
}