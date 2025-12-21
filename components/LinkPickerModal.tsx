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

// TS-safe focus helper to avoid "unknown" type complaints from DOM APIs
function safeFocus(node: any) {
  try {
    node?.focus?.();
  } catch {}
}

// Decode HTML entities in labels (e.g., &)
function decodeHtml(input: string): string {
  try {
    const ta = document.createElement('textarea');
    ta.innerHTML = input;
    return ta.value;
  } catch {
    return input;
  }
}

// Sanitize bad/blocked titles (e.g., "Access Denied") and return a better fallback
function sanitizeLabel(label: string, url: string): string {
  let s = (label || '').trim();
  if (!s) return inferLabelFromUrl(url);
  s = decodeHtml(s);
  const blocked = /(access denied|forbidden|unauthorized|robot check|restricted|blocked|not found|captcha)/i;
  if (blocked.test(s)) {
    return inferLabelFromUrl(url);
  }
  return s;
}

// Guard against localhost in production; fallback to original URL
function guardLocalhost(u: string, fallback: string): string {
  try {
    const isDev = (import.meta as any)?.env?.DEV === true;
    const host = new URL(u).hostname.toLowerCase();
    return (!isDev && (host === 'localhost' || host === '127.0.0.1' || host === '::1')) ? fallback : u;
  } catch {
    return fallback;
  }
}

const LinkPickerModal: React.FC<LinkPickerModalProps> = ({ items, open, title = 'Tap to Buy', onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Resolve any Channel 3 links at runtime so shoppers never see that domain
  const [resolvedItems, setResolvedItems] = useState<LabeledItem[]>(items);
  const retryTimers = useRef<number[]>([]);
  const retryAttempts = useRef(0);
  const [stuck, setStuck] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const channel3Idx: number[] = [];
      const channel3Urls: string[] = [];

      items.forEach((it, i) => {
        try {
          const host = new URL(it.url).hostname.toLowerCase();
          if (host.includes('trychannel3.com')) {
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
        let merged = items.map((it, i) => {
          const idx = channel3Idx.indexOf(i);
          if (idx !== -1) {
            const newUrl = guardLocalhost(resolved[idx] || it.url, it.url);
            const fetched = (titles[idx] || '') as string;
            const newLabelRaw = fetched && fetched.trim().length > 0 ? fetched.trim() : inferLabelFromUrl(newUrl);
            const newLabel = sanitizeLabel(newLabelRaw, newUrl);
            // For Channel3 items, always override label with fetched title or inferred label
            return { url: newUrl, label: newLabel };
          }
          return it;
        });

        // Second pass: any rows still pointing to trychannel3 get re-resolved individually
        const stillIdx: number[] = [];
        const stillUrls: string[] = [];
        merged.forEach((it, i) => {
          try {
            const host = new URL(it.url).hostname.toLowerCase();
            if (host.includes('trychannel3.com')) {
              stillIdx.push(i);
              stillUrls.push(it.url);
            }
          } catch {}
        });
        if (stillUrls.length) {
          try {
            const second = await apiService.publicResolveAndTitles(stillUrls);
            merged = merged.map((it, i) => {
              const pos = stillIdx.indexOf(i);
              if (pos !== -1) {
                const newUrl = guardLocalhost(second.resolved[pos] || it.url, it.url);
                const fetched = (second.titles[pos] || '') as string;
                const newLabelRaw = fetched && fetched.trim().length > 0 ? fetched.trim() : inferLabelFromUrl(newUrl);
                const newLabel = sanitizeLabel(newLabelRaw, newUrl);
                return { url: newUrl, label: newLabel };
              }
              return it;
            });
          } catch {}
        }

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

  // Automatic retry loop for any rows still unresolved after first pass
  useEffect(() => {
    if (!open) {
      // Reset attempts and clear timers when modal closes
      retryAttempts.current = 0;
      retryTimers.current.forEach((t) => clearTimeout(t));
      retryTimers.current = [];
      setStuck(new Set());
      return;
    }

    // Find any entries that are still Channel 3
    const unresolvedIdx: number[] = [];
    try {
      const base = (resolvedItems && resolvedItems.length) ? resolvedItems : items;
      base.forEach((it, i) => {
        try {
          const host = new URL(it.url).hostname.toLowerCase();
          if (host.includes('trychannel3.com')) unresolvedIdx.push(i);
        } catch {}
      });
    } catch {}

    if (unresolvedIdx.length === 0) return;
    if (retryAttempts.current >= 2) return; // Max 2 retries

    const timer = window.setTimeout(async () => {
      // Prepare URLs to re-resolve
      const urls: string[] = [];
      const snapshot = (resolvedItems && resolvedItems.length) ? resolvedItems : items;
      unresolvedIdx.forEach((i) => {
        const u = snapshot[i]?.url;
        if (u) urls.push(u);
      });
      if (urls.length === 0) return;

      try {
        const { resolved, titles } = await apiService.publicResolveAndTitles(urls);
        setResolvedItems((prev) => {
          const base = (prev && prev.length) ? prev : items;
          return base.map((it, i) => {
            const pos = unresolvedIdx.indexOf(i);
            if (pos !== -1) {
              const newUrl = guardLocalhost(resolved[pos] || it.url, it.url);
              const fetched = (titles[pos] || '') as string;
              const newLabelRaw = fetched && fetched.trim().length > 0 ? fetched.trim() : inferLabelFromUrl(newUrl);
              const newLabel = sanitizeLabel(newLabelRaw, newUrl);
              return { url: newUrl, label: it.label || newLabel };
            }
            return it;
          });
        });
      } catch {
        // ignore and allow next retry if any
      } finally {
        retryAttempts.current += 1;
      }
    }, 700);

    retryTimers.current.push(timer);
    return () => {
      // Clear only the last scheduled timer when dependencies change to avoid overlaps
      if (retryTimers.current.length) {
        const t = retryTimers.current.pop();
        if (t) clearTimeout(t);
      }
    };
  }, [open, resolvedItems, items]);

  // After retries complete, mark any indices still unresolved as stuck so UI shows "Tap to resolve"
  useEffect(() => {
    if (!open) return;
    if (retryAttempts.current < 2) return;
    const base = (resolvedItems && resolvedItems.length) ? resolvedItems : items;
    const s = new Set<number>();
    base.forEach((it, i) => {
      try {
        const host = new URL(it.url).hostname.toLowerCase();
        if (host.includes('trychannel3.com')) s.add(i);
      } catch {}
    });
    setStuck(s);
  }, [open, resolvedItems, items]);

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
    safeFocus(focusTargetEl);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Basic focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const nodeList = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;
        const focusArr = Array.from(nodeList) as HTMLElement[];
        if (focusArr.length === 0) return;
        const first = focusArr[0];
        const last = focusArr[focusArr.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Restore focus
      safeFocus(prevActive);
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
 
  // Detect if the app is running in standalone/PWA mode (iOS or other browsers)
  function isStandalonePWA(): boolean {
    try {
      const mq = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = (navigator as any)?.standalone === true; // iOS Safari to-home-screen
      return !!(mq || iosStandalone);
    } catch {
      return false;
    }
  }

  // Open a URL either in a new tab or same tab depending on environment
  function openUrlRespectEnvironment(url: string) {
    if (isStandalonePWA()) {
      // In PWA/web app mode, new tabs can be blocked or confusing; navigate same tab
      try { window.location.assign(url); } catch { window.location.href = url; }
      return true;
    }
    return false;
  }

  // Safely redirect a pre-opened about:blank window to a URL (works on iOS Safari)
  function redirectInNewWindow(win: Window, url: string) {
    try {
      const esc = url
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      win.document.open();
      win.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"referrer\" content=\"no-referrer\"><meta http-equiv=\"refresh\" content=\"0; url=${esc}\"><title>Redirecting…</title><script>try{window.opener=null;}catch(e){};location.replace('${esc}');</script></head><body style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;\">Redirecting…</body></html>`);
      win.document.close();
    } catch (err) {
      try { win.location.href = url; } catch {}
    }
  }

  const handleResolveClick = async (idx: number, originalUrl: string, e: React.MouseEvent) => {
    // If in PWA/standalone, prefer same-tab navigation
    e.preventDefault();
    if (openUrlRespectEnvironment(originalUrl)) {
      try {
        const { resolved, titles } = await apiService.publicResolveAndTitles([originalUrl]);
        const newUrl = guardLocalhost(resolved[0] || originalUrl, originalUrl);
        const fetched = (titles[0] || '') as string;
        const newLabelRaw = fetched && fetched.trim().length > 0 ? fetched.trim() : inferLabelFromUrl(newUrl);
        const newLabel = sanitizeLabel(newLabelRaw, newUrl);
        setResolvedItems(prev => prev.map((it, k) => (k === idx ? { url: newUrl, label: newLabel } : it)));
        setStuck(prev => { const copy = new Set(prev); copy.delete(idx); return copy; });
        // Navigate same tab after resolving
        try { window.location.assign(newUrl); } catch { window.location.href = newUrl; }
      } catch {
        // Fallback to original in same tab
        try { window.location.assign(originalUrl); } catch { window.location.href = originalUrl; }
      }
      return;
    }

    // Browser/tab mode: preserve user gesture by opening a blank tab immediately, then redirect that tab
    const newWin = window.open('about:blank', '_blank');
    if (!newWin) {
      // Pop-up blocked: fallback to navigating current context
      window.location.href = originalUrl;
      return;
    }
    try {
      const { resolved, titles } = await apiService.publicResolveAndTitles([originalUrl]);
      const newUrl = guardLocalhost(resolved[0] || originalUrl, originalUrl);
      const fetched = (titles[0] || '') as string;
      const newLabelRaw = fetched && fetched.trim().length > 0 ? fetched.trim() : inferLabelFromUrl(newUrl);
      const newLabel = sanitizeLabel(newLabelRaw, newUrl);
      setResolvedItems(prev => prev.map((it, k) => (k === idx ? { url: newUrl, label: newLabel } : it)));
      setStuck(prev => {
        const copy = new Set(prev);
        copy.delete(idx);
        return copy;
      });
      // Redirect the pre-opened window to the resolved URL
      redirectInNewWindow(newWin, newUrl);
    } catch {
      // Fallback: direct the pre-opened window to the original URL
      redirectInNewWindow(newWin, originalUrl);
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
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-4 outline-none"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100">{title}</h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="px-2 py-1 rounded-md text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Tip: If a link doesn’t open immediately on iPhone, tap and hold to open in a new tab.</p>

        <div className="space-y-3 max-h-80 overflow-auto pr-1">
          {uniqueItems.map((i, idx) => {
            const domain = getDomain(i.url);
            const isC3 = domain.includes('trychannel3.com');
            const icon = getFavicon(i.url);
            const baseLabel = i.label || inferLabelFromUrl(i.url);
            const cleanLabel = sanitizeLabel(baseLabel, i.url);
            // Hide domain if it's a Channel 3 link
            const displayLabel = cleanLabel;
            const displayDomain = isC3 ? '' : domain;
            return (
              <a
                key={idx}
                href={i.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // In PWA/standalone mode, force same-tab navigation for all links
                  if (!isC3 && isStandalonePWA()) {
                    e.preventDefault();
                    openUrlRespectEnvironment(i.url);
                    return;
                  }
                  if (isC3) { handleResolveClick(idx, i.url, e); }
                }}
                className="group flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-800 transition-all duration-300 ease-in-out shadow-sm hover:shadow-md border border-blue-100 hover:border-blue-200 dark:from-slate-800 dark:to-slate-900 dark:hover:from-slate-700 dark:hover:to-slate-800 dark:text-blue-100 dark:border-slate-700 dark:hover:border-slate-600"
                title={cleanLabel}
              >
                {icon ? (
                  <div className="relative">
                    <img src={icon} alt="" className="w-6 h-6 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 p-0.5" />
                    <div className="absolute -inset-1 bg-blue-200/20 dark:bg-blue-500/10 rounded-lg blur-sm group-hover:blur-md transition-all duration-300"></div>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold truncate dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-blue-50 transition-colors">{displayLabel}</span>
                  {displayDomain && <span className="text-xs text-gray-600 dark:text-slate-400 truncate mt-0.5">{displayDomain}</span>}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-2 text-blue-600 dark:text-blue-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300">
                  <path d="M16.5 3.75a.75.75 0 0 0-1.5 0v10.69l-3.22-3.22a.75.75 0 1 0-1.06 1.06l4.5 4.5a.75.75 0 0 0 1.06 0l4.5-4.5a.75.75 0 0 0-1.06-1.06l-3.22 3.22V3.75Z" />
                  <path d="M4.5 12a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6A.75.75 0 0 1 4.5 12Z" />
                </svg>
              </a>
            );
          })}
          {uniqueItems.length === 0 && (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">No links available.</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={handleCopyAll}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 font-medium transition-all duration-300 ease-in-out shadow-sm hover:shadow dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 dark:text-slate-200"
          >
            Copy all links
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Done shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkPickerModal;
