import React, { useState } from 'react';
import type { Product } from '../types';
import Spinner from './ui/Spinner';

interface DeveloperDashboardProps {
  onUrlSubmit: (url: string) => void;
  onImageUpload: (imageDataUrl: string) => void;
  onSaveProduct: () => void;
  isLoading: boolean;
  error: string | null;
  stagedProduct: Omit<Product, 'id'> | null;
  products: Product[];
  onAvatarUpload: (imageDataUrl: string) => void;
  onDeleteProduct: (id: string) => void;
  influencerAvatar: string;
}

const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  onUrlSubmit,
  onImageUpload,
  onSaveProduct,
  isLoading,
  error,
  stagedProduct,
  products,
  onAvatarUpload,
  onDeleteProduct,
  influencerAvatar,
}) => {
  const [internalUrl, setInternalUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (internalUrl) {
      onUrlSubmit(internalUrl);
    }
  };
  
  const handleSaveAndReset = () => {
    onSaveProduct();
    setInternalUrl('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onAvatarUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto space-y-12">
        {/* Control Panel */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Your Dashboard</h2>
                  <p className="text-gray-500 dark:text-slate-300 mt-1">Add items to your feed and customize your profile.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-6">
              {/* Eve Avatar (single feed) */}
              <div className="flex flex-col items-center">
                <label htmlFor="eveAvatarUpload" className="cursor-pointer group relative">
                  <img
                    src={influencerAvatar}
                    alt="Eve Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 text-white opacity-0 group-hover:opacity-100"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                      />
                    </svg>
                  </div>
                </label>
                <input
                  id="eveAvatarUpload"
                  name="eveAvatarUpload"
                  type="file"
                  className="sr-only"
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                />
                <p className="text-sm font-semibold mt-2">Eve</p>
              </div>
            </div>
          </div>
          
          <hr className="my-8 border-gray-200 dark:border-gray-700"/>

          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">Add a New Item</h3>
            <p className="text-gray-500 dark:text-slate-300 mt-1 text-sm">Generate an Instagram-style product card from a URL.</p>
          
            {!stagedProduct ? (
              <form onSubmit={handleSubmit}>
                <label htmlFor="productUrls" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Product Link(s)
                </label>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                  Tip: You can optionally add a label before a URL using “Label | https://example.com/product…”. One entry per line.
                </p>
                <div className="flex">
                  <textarea
                    id="productUrls"
                    value={internalUrl}
                    onChange={(e) => setInternalUrl(e.target.value)}
                    placeholder="Paste links (one per line). Optional: “Label | https://example.com/product…”"
                    className="flex-grow w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 transition whitespace-pre-wrap bg-white dark:bg-slate-900/50 dark:text-slate-100"
                    rows={5}
                    required
                    disabled={isLoading}
                    // iOS/mobile paste hardening
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="none"
                    autoComplete="off"
                    inputMode="text"
                    enterKeyHint="go"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center transition"
                    disabled={isLoading || !internalUrl.trim()}
                  >
                    {isLoading ? <Spinner /> : 'Go'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-slate-100">Generated Details</h3>
                  <div className="mt-2 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border dark:border-gray-700">
                    <p className="font-bold dark:text-slate-100">{stagedProduct.title}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{stagedProduct.description}</p>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Custom Influencer Image (Optional)
                    </label>
                    <label
                      htmlFor="imageUpload"
                      className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 hover:border-indigo-400 border-dashed rounded-md cursor-pointer transition"
                    >
                      <div className="space-y-1 text-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="mx-auto h-12 w-12 text-gray-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600 dark:text-slate-300">
                          <span className="relative font-medium text-indigo-600 hover:text-indigo-500">
                            Upload a file
                          </span>
                          <input
                            id="imageUpload"
                            name="imageUpload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/*"
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-2 text-center">Preview</p>
                  <div className="w-full max-w-[250px] aspect-square bg-gray-100 dark:bg-slate-900/50 rounded-lg overflow-hidden shadow-md">
                    <img
                      src={stagedProduct.customImageUrl || stagedProduct.imageUrl}
                      alt="Product Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={handleSaveAndReset}
                    className="mt-6 w-full max-w-[250px] bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    Add Product to Feed
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</p>
            )}
          </div>
        </div>

        {/* Product List */}
        {products.length > 0 && (
          <div className="w-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">
              Your Shoppable Feed ({products.length})
            </h3>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className="px-3 py-2 rounded-md bg-indigo-50 dark:bg-slate-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-slate-700"
                onClick={async () => {
                  try {
                    const res = await (
                      await fetch(
                        (import.meta as any).env?.VITE_API_URL
                          ? `${(import.meta as any).env.VITE_API_URL}/admin/debug/migrate-links`
                          : 'http://localhost:8000/api/admin/debug/migrate-links',
                        { method: 'POST', credentials: 'include' }
                      )
                    ).json();
                    alert(`Migration complete. Scanned: ${res.scanned}, Updated: ${res.updated}. Reloading products...`);
                    window.location.reload();
                  } catch (e) {
                    alert('Migration failed. Ensure you are logged in and the server is reachable.');
                  }
                }}
              >
                Fix existing links
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <div
                  key={product.id}
                  className="relative aspect-square rounded-lg overflow-hidden border shadow-sm group border-gray-200 dark:border-gray-700"
                >
                  {product.customImageUrl || product.imageUrl ? (
                    <img
                      src={product.customImageUrl || product.imageUrl!}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No image
                    </div>
                  )}
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => onDeleteProduct(product.id)}
                    className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-red-600 shadow hover:bg-white dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1.05l-1.18 12.03A3 3 0 0 1 14.78 22H9.22a3 3 0 0 1-2.99-2.97L5.05 7H4a1 1 0 1 1 0-2h4V4a1 1 0 0 1 1-1Zm1 4H7.06l1.12 11.4A1 1 0 0 0 9.22 19h5.56a1 1 0 0 0 1.04-.6L16.94 7H14v9a1 1 0 1 1-2 0V7h-2v9a1 1 0 1 1-2 0V7Z" />
                    </svg>
                  </button>
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-white text-xs font-semibold line-clamp-2">{product.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DeveloperDashboard;
