export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl?: string | null; // The default generated image (may be absent)
  productUrl: string;
  customImageUrl?: string; // The developer-uploaded image
  feed?: string; // Optional feed key for future multi-feed support (currently single Eve feed)
  // Timestamps from backend (ISO strings)
  createdAt?: string;
  updatedAt?: string;
}
