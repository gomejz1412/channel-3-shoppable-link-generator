import React, { useCallback, useMemo, useState } from 'react';
import type { Product } from '../types';
import { parseLabeledLines } from '../utils/urlUtils';
import { isTikTokBrowser } from '../utils/browserUtils';
import LinkPickerModal from './LinkPickerModal';

interface PublicProductPageProps {
  product: Product;
  influencerAvatar: string;
  index?: number;
}

const PublicProductPage: React.FC<PublicProductPageProps> = ({ product, influencerAvatar, index = 0 }) => {
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
    }

    setPickerOpen(true);
  }, [items]);

  return (
    <div
      className="group relative w-full aspect-[4/5] bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 active:scale-[1.03] animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={handleShopClick}
    >
      {/* Image Layer */}
      <div className="absolute inset-0 w-full h-full">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No image</div>
        )}
      </div>

      {/* Scrim Overlay (Bottom Gradient) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

      {/* Content Overlay */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
        {/* Top: Influencer Info */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden shadow-lg">
            <img src={influencerAvatar} alt="Eve" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest leading-none">Eve</span>
            <span className="text-[8px] text-white/50 uppercase tracking-tighter">Shop the look</span>
          </div>
        </div>

        {/* Bottom: Product Info */}
        <div className="space-y-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white leading-tight drop-shadow-md">
              {product.title}
            </h3>
            {product.description && (
              <p className="text-[10px] text-white/70 line-clamp-2 leading-snug drop-shadow-sm">
                {product.description}
              </p>
            )}
          </div>

          {/* Action Hint */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              {items.length > 1 && (
                <span className="px-1.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-[8px] font-bold text-white uppercase tracking-wider">
                  {items.length} Items
                </span>
              )}
            </div>
            <div className="flex items-center text-[10px] font-bold text-white/90 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
              Shop Now
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Inner Highlight (1px border feel) */}
      <div className="absolute inset-0 rounded-2xl border border-white/5 pointer-events-none" />

      <LinkPickerModal
        items={items}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Shop the Look"
      />
    </div>
  );
};
export default PublicProductPage;
