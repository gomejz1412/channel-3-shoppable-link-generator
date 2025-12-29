import React, { useState } from 'react';
import type { Product } from '../types';
import Spinner from './ui/Spinner';
import { parseLabeledLines, formatLabeledLines } from '../utils/urlUtils';

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
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
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
  onUpdateProduct,
  influencerAvatar,
}) => {
  const [internalUrl, setInternalUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

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

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditImageUrl(event.target.result as string);
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

          <hr className="my-8 border-gray-200 dark:border-gray-700" />

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
                      Manual Image URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={stagedProduct.customImageUrl || stagedProduct.imageUrl || ''}
                      onChange={(e) => onImageUpload(e.target.value)}
                      placeholder="Paste a public image URL..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                    />
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
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                Your Shoppable Feed ({products.length})
              </h3>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-50 dark:bg-slate-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-slate-700 transition-colors"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map(product => {
                const links = parseLabeledLines(product.productUrl);

                const handleDeleteLink = (linkUrl: string) => {
                  if (window.confirm('Are you sure you want to remove this link?')) {
                    const newLinks = links.filter(l => l.url !== linkUrl);
                    if (newLinks.length === 0) {
                      onDeleteProduct(product.id);
                    } else {
                      onUpdateProduct(product.id, { productUrl: formatLabeledLines(newLinks) });
                    }
                  }
                };

                return (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="relative aspect-video bg-gray-100 dark:bg-slate-900/50">
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
                        title="Delete Product"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this product and all its links?')) {
                            onDeleteProduct(product.id);
                          }
                        }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>

                    <div className="p-5 flex-grow flex flex-col">
                      {editingId === product.id ? (
                        <div className="space-y-3 mb-4">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2 py-1 text-lg font-bold border border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                            placeholder="Product Title"
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                            rows={3}
                            placeholder="Product Description"
                          />
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">
                              Image URL or Upload
                            </label>
                            <input
                              type="text"
                              value={editImageUrl}
                              onChange={(e) => setEditImageUrl(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                              placeholder="Image URL"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <label
                                htmlFor={`editImageUpload-${product.id}`}
                                className="cursor-pointer px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md transition-colors border border-indigo-100 dark:border-indigo-900/50"
                              >
                                Upload Image
                              </label>
                              <input
                                id={`editImageUpload-${product.id}`}
                                type="file"
                                className="sr-only"
                                onChange={handleEditFileChange}
                                accept="image/*"
                              />
                              {editImageUrl && editImageUrl.startsWith('data:') && (
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                  File selected
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditTitle('');
                                setEditDescription('');
                                setEditImageUrl('');
                              }}
                              className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                await onUpdateProduct(product.id, {
                                  title: editTitle,
                                  description: editDescription,
                                  image_url: editImageUrl
                                });
                                setEditingId(null);
                                setEditTitle('');
                                setEditDescription('');
                                setEditImageUrl('');
                              }}
                              className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-bold text-lg text-gray-800 dark:text-slate-100 line-clamp-1 flex-grow">
                              {product.title}
                            </h4>
                            <button
                              onClick={() => {
                                setEditingId(product.id);
                                setEditTitle(product.title);
                                setEditDescription(product.description || '');
                                setEditImageUrl(product.image_url || '');
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-shrink-0"
                              title="Edit Details"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mb-4">
                            {product.description}
                          </p>
                        </>
                      )}

                      <div className="mt-auto space-y-2">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                          Links ({links.length})
                        </p>
                        {links.map((link, idx) => (
                          <div
                            key={idx}
                            className="group/link flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors"
                          >
                            <div className="flex flex-col min-w-0 flex-grow mr-3">
                              {link.label && (
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                  {link.label}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                {link.url}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Open Link"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3" />
                                </svg>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(link.url)}
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Remove Link"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DeveloperDashboard;
