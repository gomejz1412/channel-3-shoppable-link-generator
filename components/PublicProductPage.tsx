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
      className="group relative w-full aspect-[4/5] bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl transition-transform duration-300 ease-out active:scale-[1.03] motion-reduce:active:scale-100 animate-fade-in-up cursor-pointer"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={handleShopClick}
    >
      {/* Image Layer */}
      <div className="absolute inset-0 w-full h-full">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-800 text-xs">No image</div>
        )}
      </div>

      {/* Scrim Overlay (Bottom Gradient) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 25%, rgba(0,0,0,0) 55%)'
        }}
      />

      {/* Content Overlay */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none">
        {/* Top: Influencer Info */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden shadow-2xl backdrop-blur-md">
            <img src={influencerAvatar} alt="Eve" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-black text-white uppercase tracking-[0.1em] leading-none drop-shadow-md">Eve</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Shop the look</span>
          </div>
        </div>

        {/* Bottom: Product Info */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-white leading-tight tracking-tight drop-shadow-2xl">
              {product.title}
            </h3>
            {product.description && (
              <p className="text-[12px] text-white/60 line-clamp-2 leading-relaxed font-medium drop-shadow-lg">
                {product.description}
              </p>
            )}
          </div>

          {/* Action Hint */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              {items.length > 1 && (
                <span className="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-2xl border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                  {items.length} Items
                </span>
              )}
            </div>
            <div className="flex items-center text-[12px] font-black text-white uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform duration-300">
              Shop Now
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Inner Highlight (1px border feel) */}
      <div className="absolute inset-0 rounded-2xl border border-white/5 pointer-events-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" />

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
