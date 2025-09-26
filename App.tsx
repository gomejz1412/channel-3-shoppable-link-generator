
import React, { useState, useCallback, useEffect } from 'react';
import type { Product } from './types';
import { generateProductDetails } from './services/geminiService';
import { apiService } from './services/apiService';
import DeveloperDashboard from './components/DeveloperDashboard';
import PublicProductPage from './components/PublicProductPage';
import Login from './components/Login';
import { parseUrls } from './utils/urlUtils';

const DEFAULT_AVATAR = 'https://picsum.photos/seed/influencer/100/100';

// Public path for the public feed (hash-based): configurable via env
const PUBLIC_PATH = (import.meta as any).env?.VITE_PUBLIC_PATH || '/public';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stagedProduct, setStagedProduct] = useState<Omit<Product, 'id'> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pathname, setPathname] = useState('/');
  const [publicFeedData, setPublicFeedData] = useState<{ products: Product[]; influencerAvatar?: string } | null>(null);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [influencerAvatar, setInfluencerAvatar] = useState<string>(DEFAULT_AVATAR);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isPublicView = pathname === PUBLIC_PATH;

  // Load products from backend when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadProducts = async () => {
        try {
          const backendProducts = await apiService.getProducts();
          setProducts(backendProducts);
        } catch (error) {
          console.error('Failed to load products from backend:', error);
        }
      };
      loadProducts();

      // Sync avatar from backend settings so the public link uses it
      (async () => {
        try {
          const s = await apiService.getSettings();
          if (s?.avatar_url) {
            setInfluencerAvatar(s.avatar_url);
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem('channel3-avatar', s.avatar_url);
              } catch {}
            }
          }
        } catch (e) {
          console.error('Failed to load settings from backend:', e);
        }
      })();
    }
  }, [isAuthenticated]);

  // Load public feed from backend when in public view
  useEffect(() => {
    const isPublicView = pathname === PUBLIC_PATH;
    if (isPublicView && !publicFeedData) {
      const loadPublicFeed = async () => {
        try {
          const feed = await apiService.getPublicFeed();
          setPublicFeedData({ products: feed.products, influencerAvatar: feed.influencerAvatar || DEFAULT_AVATAR });
        } catch (error) {
          console.error('Failed to load public feed from backend:', error);
        }
      };
      loadPublicFeed();
    }
  }, [pathname, publicFeedData]);

  // Effect to save avatar to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('channel3-avatar', influencerAvatar);
      } catch (e) {
        console.error("Failed to save avatar to localStorage", e);
      }
    }
  }, [influencerAvatar]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!process.env.API_KEY) {
        setIsApiKeyMissing(true);
      }

      const onLocationChange = () => {
        const hash = window.location.hash;
        const [path] = hash.substring(1).split('?');

        // Backward-compat: redirect old /public hash to configured PUBLIC_PATH
        if (path === '/public' && PUBLIC_PATH !== '/public') {
          window.location.hash = PUBLIC_PATH;
          return;
        }

        setPathname(path || '/');
        // Always fetch live public feed from backend; no client-side share payloads
        setPublicFeedData(null);
      };
      onLocationChange();
      window.addEventListener('hashchange', onLocationChange);
      return () => {
        window.removeEventListener('hashchange', onLocationChange);
      };
    }
  }, []);
  
  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };


  const handleUrlSubmit = useCallback(async (urlString: string) => {
    setIsLoading(true);
    setError(null);
    setStagedProduct(null);
    try {
      // Parse incoming URLs
      const urls = parseUrls(urlString);
      if (urls.length === 0) {
        throw new Error('No valid http(s) URLs found in input.');
      }

      // Resolve Channel 3 links server-side (preserve order)
      const resolved = await apiService.resolveUrls(urls);

      // Use first resolved URL for AI title/description + preview image seed
      const firstResolved = resolved[0] || urls[0];

      const { title, description } = await generateProductDetails(firstResolved);

      // Store the FULL resolved list (one per line) so public modal shows destination links
      const resolvedMultiline = resolved.join('\n');

      setStagedProduct({
        title,
        description,
        productUrl: resolvedMultiline,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(firstResolved)}/400/400`
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImageUpload = useCallback((imageDataUrl: string) => {
    if (stagedProduct) {
      setStagedProduct(prev => prev ? { ...prev, customImageUrl: imageDataUrl } : null);
    }
  }, [stagedProduct]);

  const handleSaveProduct = useCallback(async () => {
    if (stagedProduct) {
      try {
        // Add required is_published field that backend expects
        const productData = {
          ...stagedProduct,
          is_published: true  // Default to published when creating
        };
        const savedProduct = await apiService.createProduct(productData);
        setProducts(prev => [...prev, savedProduct]);
        setStagedProduct(null);
        setError(null);
      } catch (error) {
        console.error('Failed to save product to backend:', error);
        setError('Failed to save product. Please try again.');
      }
    }
  }, [stagedProduct]);
  
  const handleAvatarUpload = useCallback(async (imageDataUrl: string) => {
    setInfluencerAvatar(imageDataUrl);
    // Persist avatar on the backend so /#/public (and SSR) can use it without special links
    try {
      await apiService.updateSettings(imageDataUrl);
    } catch (e) {
      console.error('Failed to persist avatar to backend:', e);
    }
  }, []);
  
  const handleLogin = async (password: string) => {
    try {
      const result = await apiService.login(password);
      if (result.success) {
        setIsAuthenticated(true);
        setLoginError(null);
      } else {
        setLoginError('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Connection error. Please check if the backend server is running.');
    }
  };
  
  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      navigate('/');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await apiService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setError(null);
    } catch (e) {
      console.error('Failed to delete product:', e);
      setError('Failed to delete product. Please try again.');
    }
  };

  const showMainApp = isPublicView || isAuthenticated;

  const productsToDisplay = isPublicView && publicFeedData ? publicFeedData.products : products;
  const avatarToDisplay = isPublicView && publicFeedData ? (publicFeedData.influencerAvatar || DEFAULT_AVATAR) : influencerAvatar;

  const filteredProducts = productsToDisplay.filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {showMainApp ? (
        <main key="app" className="relative">
          {isApiKeyMissing && !isPublicView && isAuthenticated && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
              <p className="font-bold">Warning</p>
              <p>No API_KEY found. The application is running in mock mode. AI features are disabled.</p>
            </div>
          )}
          {isAuthenticated && (
            <div className="absolute top-4 right-4 z-10">
              <div className="relative inline-block text-left">
                <div className="bg-white p-1 rounded-full shadow-md border border-gray-200 flex items-center space-x-1">
                  <button
                    onClick={() => navigate('/')}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${!isPublicView ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => navigate(PUBLIC_PATH)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${isPublicView ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'} disabled:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    disabled={products.length === 0}
                  >
                    Public View
                  </button>
                  <div className="border-l border-gray-200 h-6 mx-1"></div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-sm font-medium rounded-full transition-colors text-red-600 hover:bg-red-50"
                    title="Logout"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0-3-3m0 0 3-3m-3 3H9" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {isPublicView ? (
            <div className="w-full min-h-screen p-4 md:p-8 bg-slate-50">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">Shop The Feed</h1>
                  <p className="mt-2 text-lg text-gray-500">Find your new favorites, curated with Eve.</p>
                </div>

                <div className="flex justify-center items-center gap-6 mb-10">
                  <a
                    href="https://ko-fi.com/xyzeve"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Support on Ko-fi"
                    title="Support on Ko-fi"
                    className="group relative inline-flex items-center justify-center p-2 rounded-full bg-white/70 backdrop-blur-sm text-gray-600 shadow-sm ring-1 ring-slate-200/60 hover:shadow-md hover:text-blue-600 hover:ring-2 hover:ring-blue-300/50 transition-all duration-300 animate-float-slow neon-orbit neon-cyan"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 19.5v-8.25M12 4.875A3.375 3.375 0 006.375 8.25h11.25A3.375 3.375 0 0012 4.875z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.875v16.5" />
                    </svg>
                  </a>
                  <a
                    href="https://cash.app/$eveoneuno"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Support on Cash App"
                    title="Support on Cash App"
                    className="group relative inline-flex items-center justify-center p-2 rounded-full bg-white/70 backdrop-blur-sm text-gray-600 shadow-sm ring-1 ring-slate-200/60 hover:shadow-md hover:text-green-600 hover:ring-2 hover:ring-green-300/50 transition-all duration-300 animate-float-slow neon-orbit neon-green"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.577-.459 1.278-.659 2.003-.659 1.519 0 2.922.81 3.624 2.048" />
                    </svg>
                  </a>
                  <a
                    href="https://dfans.co/eve1"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="See more on Dfans"
                    title="See more on Dfans"
                    className="group relative inline-flex items-center justify-center p-2 rounded-full bg-white/70 backdrop-blur-sm text-gray-600 shadow-sm ring-1 ring-slate-200/60 hover:shadow-md hover:text-red-600 hover:ring-2 hover:ring-red-300/50 transition-all duration-300 animate-float-slow neon-orbit neon-red"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/xyzeve1/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow on Instagram"
                    title="Follow on Instagram"
                    className="group relative inline-flex items-center justify-center p-2 rounded-full bg-white/70 backdrop-blur-sm text-gray-600 shadow-sm ring-1 ring-slate-200/60 hover:shadow-md hover:text-pink-600 hover:ring-2 hover:ring-pink-300/50 transition-all duration-300 animate-float-slow neon-orbit neon-pink"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" fill="none"/>
                        <path d="M16 11.37a4 4 0 1 1-6.26-3.37 4 4 0 0 1 6.26 3.37z" />
                        <line x1="17.5" y1="6.5" x2="17.5" y2="6.501" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </a>
                  <a
                    href="https://www.tiktok.com/@dfans.xyzeve1"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow on TikTok"
                    title="Follow on TikTok"
                    className="group relative inline-flex items-center justify-center p-2 rounded-full bg-white/70 backdrop-blur-sm text-gray-600 shadow-sm ring-1 ring-slate-200/60 hover:shadow-md hover:text-black hover:ring-2 hover:ring-neutral-300/60 transition-all duration-300 animate-float-slow neon-orbit neon-neutral"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.86-.95-6.43-2.8-1.58-1.85-2.04-4.35-1.5-6.58.56-2.27 2.31-4.08 4.39-5.05 2.08-.97 4.4-.9 6.35.26.24.14.48.29.7.47.01-1.33.02-2.65.01-3.97.01-2.82.02-5.64.01-8.46Z"/>
                    </svg>
                  </a>
                </div>

                <div className="mb-8 max-w-lg mx-auto">
                    <input
                        type="search"
                        placeholder="Search for products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                    />
                </div>
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                    {filteredProducts.map(product => (
                      <PublicProductPage
                        key={product.id}
                        product={product}
                        influencerAvatar={avatarToDisplay}
                      />
                    ))}
                  </div>
                ) : (
                    <div className="text-center py-16">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                      <p className="mt-1 text-sm text-gray-500">{searchTerm ? "Try adjusting your search." : "The feed is currently empty."}</p>
                    </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full min-h-screen flex flex-col items-center p-4 md:p-8 bg-slate-50">
              <DeveloperDashboard
                onUrlSubmit={handleUrlSubmit}
                onImageUpload={handleImageUpload}
                onSaveProduct={handleSaveProduct}
                isLoading={isLoading}
                error={error}
                stagedProduct={stagedProduct}
                products={products}
                onAvatarUpload={handleAvatarUpload}
                onDeleteProduct={handleDeleteProduct}
                influencerAvatar={influencerAvatar}
              />
            </div>
          )}
        </main>
      ) : (
         <Login key="login" onLogin={handleLogin} error={loginError} />
      )}
    </>
  );
};

export default App;
