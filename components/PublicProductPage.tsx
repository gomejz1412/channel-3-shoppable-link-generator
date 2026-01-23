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
      className="group relative w-full aspect-[4/5] bg-[#0a0a0a] rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-fade-in-up cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={handleShopClick}
    >
      {/* Image Layer with Parallax-like scale */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">No image</div>
        )}
      </div>

      {/* High-Fidelity Scrim Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0) 75%)'
        }}
      />

      {/* Content Overlay */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
        {/* Top: Influencer Badge */}
        <div className="flex items-center space-x-3 transform group-hover:translate-y-[-2px] transition-transform duration-500">
          <div className="w-11 h-11 rounded-full border-2 border-white/30 overflow-hidden shadow-2xl backdrop-blur-xl ring-4 ring-black/20">
            <img src={influencerAvatar} alt="Eve" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-black text-white uppercase tracking-[0.15em] leading-none drop-shadow-md">Eve</span>
            <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Verified Look</span>
          </div>
        </div>

        {/* Bottom: Product Info */}
        <div className="space-y-4 transform group-hover:translate-y-[-4px] transition-transform duration-500">
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white leading-[1.1] tracking-tight drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
              {product.title}
            </h3>
            {product.description && (
              <p className="text-[13px] text-white/70 line-clamp-2 leading-relaxed font-medium drop-shadow-md max-w-[90%]">
                {product.description}
              </p>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {items.length > 1 && (
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 text-[10px] font-black text-white uppercase tracking-[0.1em] shadow-xl">
                  {items.length} Options
                </span>
              )}
            </div>
            <div className="flex items-center text-[12px] font-black text-white uppercase tracking-[0.25em] group-hover:translate-x-2 transition-transform duration-500">
              Shop Now
              <div className="ml-2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-2xl group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Micro-Depth: Inner Highlight & Glass Border */}
      <div className="absolute inset-0 rounded-[24px] border border-white/10 pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />

      {/* Subtle Grain Overlay for Cinematic Feel */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

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
