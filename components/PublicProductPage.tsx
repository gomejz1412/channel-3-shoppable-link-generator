import React, { useCallback, useMemo, useState } from 'react';
import type { Product } from '../types';
import { parseLabeledLines } from '../utils/urlUtils';
import { isTikTokBrowser } from '../utils/browserUtils';
import LinkPickerModal from './LinkPickerModal';

interface PublicProductPageProps {
  product: Product;
  influencerAvatar: string;
}

const PublicProductPage: React.FC<PublicProductPageProps> = ({ product, influencerAvatar }) => {
  const displayImageUrl =
    product.customImageUrl || product.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(product.slug)}/400/400`;

  const items = useMemo(() => parseLabeledLines(product.productUrl), [product.productUrl]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleShopClick = useCallback(() => {
    if (items.length === 0) {
      alert('No valid links found. Paste http(s) URLs one per line.');
      return;
    }

    if (isTikTokBrowser()) {
      alert("Please tap the menu icon (•••) and select 'Open in Browser' to view these links.");
      // We still allow them to proceed, but the alert gives them the critical instruction.
    }

    setPickerOpen(true);
  }, [items]);

  return (
    <div className="w-full mx-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden flex flex-col">
      <header className="flex items-center p-4 border-b border-gray-100 dark:border-gray-700">
        <img src={influencerAvatar} alt="Influencer" className="w-10 h-10 rounded-full object-cover" />
        <div className="ml-3">
          <p className="font-semibold text-sm text-gray-800 dark:text-slate-100">Eve</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Affiliate Link</p>
        </div>
      </header>

      <div className="aspect-square bg-gray-100 dark:bg-slate-900/50">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={product.title}
            className="w-full h-full object-contain object-center sm:object-cover"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={400}
            height={400}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-gray-800 dark:text-slate-100">{product.title}</p>
            {/* Social proof/urgency badges - could be dynamic based on product data */}
            <div className="flex gap-1">
              {items.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Popular
                </span>
              )}
              {product.description && product.description.length > 100 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Limited Time
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed mt-1">{product.description}</p>
          {/* Mock "Customers also viewed" hint */}
          {items.length > 1 && (
            <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.66 0-1.293.103-1.879.294M5.25 21.5c.66 0 1.293-.103 1.879-.294" />
              </svg>
              <span>Multiple buying options available</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleShopClick}
          className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 group"
          aria-label="Tap to Buy"
          title={items.length > 1 ? `${Math.min(items.length, 10)} products available` : '1 product available'}
        >
          {items.length > 1 ? `Tap to Buy (${Math.min(items.length, 10)})` : 'Tap to Buy'}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform duration-200"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </button>
      </div>

      <LinkPickerModal
        items={items}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Tap to Buy"
      />
    </div>
  );
};

export default PublicProductPage;
