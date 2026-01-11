/**
 * Detects if the current browser is the TikTok in-app browser.
 * Checks for common keywords in the User Agent string.
 */
export function isTikTokBrowser(): boolean {
    if (typeof window === 'undefined') return false;

    const ua = window.navigator.userAgent.toLowerCase();
    return (
        ua.includes('tiktok') ||
        ua.includes('trill') ||
        ua.includes('musical_ly') ||
        ua.includes('bytelocale')
    );
}
