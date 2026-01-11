import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
            <div className="relative flex items-center justify-center">
                {/* Outer glowing ring */}
                <div className="absolute animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-indigo-500/30 dark:border-indigo-400/30"></div>

                {/* Inner fast spinning ring */}
                <div className="absolute animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>

                {/* Center pulsing dot */}
                <div className="h-4 w-4 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.8)]"></div>
            </div>

            {/* Loading text with pulse */}
            <div className="mt-8 text-lg font-medium text-gray-600 dark:text-slate-300 animate-pulse tracking-wider uppercase text-xs">
                Loading Experience
            </div>
        </div>
    );
};

export default LoadingSpinner;
