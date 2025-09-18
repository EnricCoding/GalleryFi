'use client';

import { memo, useId, KeyboardEvent } from 'react';

type Props = {
    checked: boolean;
    onChange: (v: boolean) => void;
    label?: string;
};

const OnlyListedToggle = memo(function OnlyListedToggle({
    checked,
    onChange,
    label = 'Can buy/bid',
}: Props) {
    const labelId = useId();

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
        }
    };

    return (
        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <span
                id={labelId}
                className={`text-sm font-medium transition-colors duration-200 ${
                    checked 
                        ? 'text-accent-dark dark:text-accent font-semibold' 
                        : 'text-neutral-600 dark:text-neutral-400'
                }`}
            >
                {label}
            </span>
            
            {/* Helper text */}
            <span className={`text-xs transition-all duration-200 ${
                checked 
                    ? 'text-accent-dark dark:text-accent font-medium animate-pulse' 
                    : 'text-neutral-400 dark:text-neutral-500'
            }`}>
                {checked ? '🎯 Available now' : 'Show all'}
            </span>

            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={labelId}
                onClick={() => onChange(!checked)}
                onKeyDown={handleKeyDown}
                title={`${label}: ${checked ? 'On' : 'Off'}`}
                className={[
                    'relative inline-flex w-12 h-7 items-center rounded-full p-0.5',
                    'transition-all duration-300 focus:outline-none transform hover:scale-105',
                    'focus-visible:ring-2 focus-visible:ring-offset-2',
                    'focus-visible:ring-accent focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
                    checked
                        ? [
                            'bg-gradient-to-r from-accent-dark to-accent',
                            'shadow-lg shadow-accent/30 ring-2 ring-accent/20 scale-105',
                            'animate-pulse',
                        ].join(' ')
                        : 'bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500',
                ].join(' ')}
            >
                <span
                    className={[
                        'absolute h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-300',
                        'flex items-center justify-center',
                        checked ? 'translate-x-5 ring-2 ring-white/20 shadow-xl' : 'translate-x-0',
                    ].join(' ')}
                >
                    {checked && (
                        <svg 
                            className="w-3 h-3 text-accent animate-pulse" 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                        >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </span>
            </button>
        </label>
    );
});

export default OnlyListedToggle;
