import React from 'react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="fixed top-3 right-3 z-50 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-2 shadow hover:bg-white dark:hover:bg-slate-700 transition"
    >
      {isDark ? (
        // Sun icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400">
          <path d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-5a1 1 0 0 1-1 1h-2a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1ZM5 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1Zm12.657 6.657a1 1 0 0 1-1.414 0l-1.415-1.414a1 1 0 0 1 1.415-1.415l1.414 1.415a1 1 0 0 1 0 1.414ZM8.172 7.172a1 1 0 0 1-1.415-1.415L8.172 4.34a1 1 0 0 1 1.415 1.415L8.172 7.172Zm9.9-2.829a1 1 0 0 1 0 1.414L16.657 7.17a1 1 0 1 1-1.414-1.414l1.414-1.415a1 1 0 0 1 1.415 0ZM7.172 15.828a1 1 0 0 1 0-1.415l1.415-1.414a1 1 0 0 1 1.414 1.415l-1.414 1.414a1 1 0 0 1-1.415 0Z"/>
        </svg>
      ) : (
        // Moon icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-700 dark:text-slate-200">
          <path d="M21.752 15.002a9 9 0 1 1-12.754-10.25 1 1 0 0 1 1.21 1.21A7 7 0 1 0 20.54 13.79a1 1 0 0 1 1.21 1.21Z"/>
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
