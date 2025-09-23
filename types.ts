export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl?: string | null; // The default generated image (may be absent)
  productUrl: string;
  customImageUrl?: string; // The developer-uploaded image
}
