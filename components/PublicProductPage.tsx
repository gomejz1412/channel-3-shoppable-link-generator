import React, { useCallback, useMemo } from 'react';
import type { Product } from '../types';
import { parseUrls } from '../utils/urlUtils';

interface PublicProductPageProps {
  product: Product;
  influencerAvatar: string;
}

const PublicProductPage: React.FC<PublicProductPageProps> = ({ product, influencerAvatar }) => {
  const displayImageUrl = product.customImageUrl || product.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(product.slug)}/400/400`;

  const urls = useMemo(() => parseUrls(product.productUrl), [product.productUrl]);

  const handleShopClick = useCallback(() => {
    const urls = parseUrls(product.productUrl);
    if (urls.length === 0) {
      alert('No valid links found. Paste http(s) URLs one per line.');
      return;
    }
    const toOpen = urls.slice(0, 10);
    const targets = toOpen.map((_, i) => `c3_tab_${Date.now()}_${i}`);

    // Step 1: Pre-open blank named tabs within the user gesture
    const wins: (Window | null)[] = [];
    for (let i = 0; i < toOpen.length; i++) {
      try {
        wins[i] = window.open('about:blank', targets[i]); // open named blank tab (no features string)
      } catch {
        wins[i] = null;
      }
    }

    // Step 2: Navigate opened tabs to their URLs
    let openedCount = 0;
    for (let i = 0; i < toOpen.length; i++) {
      try {
        if (wins[i]) {
          wins[i]!.location.href = toOpen[i];
          openedCount++;
        }
      } catch {
        // ignore
      }
    }

    // Step 3: Fallback for any that failed to open using anchor clicks
    if (openedCount < toOpen.length) {
      for (let i = 0; i < toOpen.length; i++) {
        if (!wins[i]) {
          try {
            const a = document.createElement('a');
            a.href = toOpen[i];
            a.target = targets[i];
            a.rel = 'noopener noreferrer';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            openedCount++;
          } catch {
            // ignore
          }
        }
      }
    }

    if (openedCount === 0) {
      alert('Pop-ups were blocked. Please allow pop-ups for this site to open links.');
    }
  }, [product.productUrl]);

  return (
    <div className="w-full mx-auto bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden flex flex-col">
      <header className="flex items-center p-4 border-b border-gray-100">
        <img src={influencerAvatar} alt="Influencer" className="w-10 h-10 rounded-full object-cover" />
        <div className="ml-3">
          <p className="font-semibold text-sm text-gray-800">Eve</p>
          <p className="text-xs text-gray-500">Affiliate Link</p>
        </div>
      </header>

      <div className="aspect-square bg-gray-100">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={400}
            height={400}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No image
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
         <div className="flex-grow">
            <p className="font-semibold text-gray-800">{product.title}</p>
            <p className="text-gray-700 text-sm leading-relaxed mt-1">{product.description}</p>
        </div>
        <button
          type="button"
          onClick={handleShopClick}
          className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 ease-in-out text-center"
          aria-label="Shop Now"
          title={urls.length > 1 ? `Opens ${Math.min(urls.length, 10)} links` : 'Opens 1 link'}
        >
          {urls.length > 1 ? `Shop Now (${Math.min(urls.length, 10)})` : 'Shop Now'}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 ml-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PublicProductPage;
