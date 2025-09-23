// Service for API calls to the FastAPI backend
import type { Product } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// Map backend API product (snake_case) to frontend Product (camelCase)
function mapProductFromApi(api: any): Product {
  return {
    id: api.id,
    slug: api.slug,
    title: api.title,
    description: api.description ?? '',
    // Use null if missing to avoid passing empty string to <img src>
    imageUrl: api.image_url ?? null,
    productUrl: api.product_url,
    // Backend doesn't store customImageUrl; it's client-side only
    customImageUrl: undefined,
  };
}

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for session authentication
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Product management
  async getProducts(): Promise<Product[]> {
    // Use trailing slash to avoid 307 redirect issues in browsers
    const list = await this.request('/admin/products/');
    return (Array.isArray(list) ? list : []).map(mapProductFromApi);
  }

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    // Map frontend camelCase fields to backend snake_case and whitelist allowed fields
    const payload: Record<string, any> = {
      title: (productData as any).title,
      description: (productData as any).description ?? null,
      product_url:
        (productData as any).product_url ??
        (productData as any).productUrl,
      image_url:
        (productData as any).image_url ??
        (productData as any).customImageUrl ??
        (productData as any).imageUrl ??
        null,
      is_published: (productData as any).is_published ?? false,
    };

    // Use trailing slash to avoid 307 + dropped body on redirect
    const created = await this.request('/admin/products/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapProductFromApi(created);
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    // Map and include only provided fields
    const payload: Record<string, any> = {};
    if ((productData as any).title !== undefined) payload.title = (productData as any).title;
    if ((productData as any).description !== undefined) payload.description = (productData as any).description;

    if ((productData as any).product_url !== undefined) {
      payload.product_url = (productData as any).product_url;
    } else if ((productData as any).productUrl !== undefined) {
      payload.product_url = (productData as any).productUrl;
    }

    if ((productData as any).image_url !== undefined) {
      payload.image_url = (productData as any).image_url;
    } else if ((productData as any).customImageUrl !== undefined) {
      payload.image_url = (productData as any).customImageUrl;
    } else if ((productData as any).imageUrl !== undefined) {
      payload.image_url = (productData as any).imageUrl;
    }

    if ((productData as any).is_published !== undefined) {
      payload.is_published = (productData as any).is_published;
    }

    const updated = await this.request(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mapProductFromApi(updated);
  }

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Public feed
  async getPublicFeed(): Promise<{ products: Product[]; bundles: any[]; influencerAvatar?: string | null }> {
    const resp = await this.request('/public/');
    return {
      products: (resp.products || []).map(mapProductFromApi),
      bundles: resp.bundles || [],
      influencerAvatar: resp.influencer_avatar ?? null,
    };
  }

  // Authentication
  async login(password: string): Promise<{ success: boolean; message: string }> {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request('/logout', {
      method: 'POST',
    });
  }

  // Settings (avatar)
  async getSettings(): Promise<{ avatar_url: string | null }> {
    return this.request('/admin/settings/', {
      method: 'GET',
    });
  }

  async updateSettings(avatarUrl: string): Promise<{ avatar_url: string | null }> {
    return this.request('/admin/settings/', {
      method: 'PUT',
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
  }
}

export const apiService = new ApiService();
