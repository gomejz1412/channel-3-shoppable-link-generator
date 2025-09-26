import React, { useEffect, useMemo, useRef, useState } from 'react';
import { inferLabelFromUrl, LabeledItem } from '../utils/urlUtils';
import { apiService } from '../services/apiService';

interface LinkPickerModalProps {
  items: LabeledItem[];
  open: boolean;
  title?: string;
  onClose: () => void;
}

function getDomain(u: string): string {
  try {
    const url = new URL(u);
    return url.hostname;
  } catch {
    return '';
  }
}

function getFavicon(u: string): string {
  const domain = getDomain(u);
  if (!domain) return '';
  // Use DuckDuckGo icons service (robust)
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

function getProductType(u: string): string {
  try {
    const url = new URL(u);
    const segs = url.pathname.split('/').filter(Boolean);
    if (segs.length === 0) return url.hostname;
    const last = segs[segs.length - 1]
      .split('?')[0]
      .split('#')[0]
      .replace(/[-_]+/g, ' ')
      .trim();
    // Capitalize words
    return last
      .split(' ')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  } catch {
    return u;
  }
}

const LinkPickerModal: React.FC<LinkPickerModalProps> = ({ items, open, title = 'Shop the Look', onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Resolve any Channel 3 links at runtime so shoppers never see that domain
  const [resolvedItems, setResolvedItems] = useState<LabeledItem[]>(items);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const channel3Idx: number[] = [];
      const channel3Urls: string[] = [];

      items.forEach((it, i) => {
        try {
          const host = new URL(it.url).hostname.toLowerCase();
          if (host === 'buy.trychannel3.com') {
            channel3Idx.push(i);
            channel3Urls.push(it.url);
          }
        } catch {
          // ignore invalid
        }
      });

      if (channel3Urls.length === 0) {
        if (!cancelled) setResolvedItems(items);
        return;
      }

      try {
        const { resolved, titles } = await apiService.publicResolveAndTitles(channel3Urls);
        const merged = items.map((it, i) => {
          const idx = channel3Idx.indexOf(i);
          if (idx !== -1) {
            const newUrl = resolved[idx] || it.url;
            const fetched = (titles[idx] || '') as string;
            const newLabel = fetched && fetched.trim().length > 0 ? fetched.trim() : inferLabelFromUrl(newUrl);
            // For Channel3 items, always override label with fetched title or inferred label
            return { url: newUrl, label: newLabel };
          }
          return it;
        });
        if (!cancelled) setResolvedItems(merged);
      } catch {
        if (!cancelled) setResolvedItems(items);
      }
    }

    if (open) {
      run();
    } else {
      setResolvedItems(items);
    }

    return () => {
      cancelled = true;
    };
  }, [open, items]);

  const uniqueItems = useMemo(() => {
    const base = (resolvedItems && resolvedItems.length) ? resolvedItems : items;
    const seen = new Set<string>();
    const out: LabeledItem[] = [];
    for (const it of base) {
      try {
        const u = new URL(it.url).toString();
        if (!seen.has(u)) {
          seen.add(u);
          out.push({ url: u, label: it.label && it.label.trim() ? it.label.trim() : undefined });
        }
      } catch {
        // ignore invalid urls
      }
    }
    // Ensure label fallback
    return out.slice(0, 10).map(i => ({ url: i.url, label: i.label || inferLabelFromUrl(i.url) }));
  }, [resolvedItems, items]);

  useEffect(() => {
    if (!open) return;

    // Focus management
    const prevActive = document.activeElement as HTMLElement | null;
    const focusTargetEl: HTMLElement | null =
      (closeBtnRef.current as HTMLElement | null) ??
      (dialogRef.current as HTMLElement | null);
    try {
      focusTargetEl?.focus();
    } catch {}

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Basic focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const focusArr = Array.from(focusables);
        if (focusArr.length === 0) return;
        const first = focusArr[0];
        const last = focusArr[focusArr.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Restore focus
      try {
        prevActive?.focus();
      } catch {}
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleCopyAll = async () => {
    try {
      if (navigator && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(uniqueItems.map(i => i.url).join('\n'));
        alert('Copied remaining links to clipboard.');
      } else {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = uniqueItems.map(i => i.url).join('\n');
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('Copied remaining links to clipboard.');
      }
    } catch {
      alert('Copy failed. You can select and copy manually.');
    }
  };
 
  const handleResolveClick = async (idx: number, originalUrl: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { resolved, titles } = await apiService.publicResolveAndTitles([originalUrl]);
      const newUrl = resolved[0] || originalUrl;
      const fetched = (titles[0] || '') as string;
      const newLabel = fetched && fetched.trim().length > 0 ? fetched.trim() : inferLabelFromUrl(newUrl);
      setResolvedItems(prev => prev.map((it, k) => (k === idx ? { url: newUrl, label: newLabel } : it)));
      window.open(newUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback to original if resolution fails
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    }
  };
 
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 outline-none"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {uniqueItems.map((i, idx) => {
            const domain = getDomain(i.url);
            const isC3 = domain === 'buy.trychannel3.com';
            const icon = getFavicon(i.url);
            const label = i.label || inferLabelFromUrl(i.url);
            const displayLabel = (isC3 || /ytnave/i.test(label)) ? 'Shop Link' : label;
            const displayDomain = isC3 ? '' : domain;
            return (
              <a
                key={idx}
                href={i.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { if (isC3) { handleResolveClick(idx, i.url, e); } }}
                className="group flex items-center gap-3 w-full px-3 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                title={`${i.url}\n${label}`}
              >
                {icon ? (
                  <img src={icon} alt="" className="w-5 h-5 rounded-sm border border-gray-200 bg-white" />
                ) : (
                  <div className="w-5 h-5 rounded-sm border border-gray-200 bg-white"></div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{displayLabel}</span>
                  <span className="text-xs text-gray-500 truncate">{displayDomain}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-auto opacity-60 group-hover:opacity-100">
                  <path d="M16.5 3.75a.75.75 0 0 0-1.5 0v10.69l-3.22-3.22a.75.75 0 1 0-1.06 1.06l4.5 4.5a.75.75 0 0 0 1.06 0l4.5-4.5a.75.75 0 0 0-1.06-1.06l-3.22 3.22V3.75Z" />
                  <path d="M4.5 12a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6A.75.75 0 0 1 4.5 12Z" />
                </svg>
              </a>
            );
          })}
          {uniqueItems.length === 0 && (
            <p className="text-sm text-gray-600">No links available.</p>
          )}
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={handleCopyAll}
            className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Copy all
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkPickerModal;
