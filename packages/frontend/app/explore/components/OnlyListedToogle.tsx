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
    label = 'Only listed',
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
                className="text-sm text-neutral-700 dark:text-neutral-300"
            >
                {label}
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
                    'transition-all duration-200 focus:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-offset-2',
                    'focus-visible:ring-emerald-400 dark:focus-visible:ring-emerald-300',
                    'focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
                    checked
                        ? [
                            'bg-gradient-to-r from-emerald-500 to-emerald-600',
                            'dark:from-emerald-400 dark:to-emerald-500',
                            'ring-1 ring-emerald-300/60 shadow-md shadow-emerald-700/25',
                        ].join(' ')
                        : 'bg-neutral-300 dark:bg-neutral-600',
                ].join(' ')}
            >
                <span
                    className={[
                        'absolute h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                        checked ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')}
                />
            </button>
        </label>
    );
});

export default OnlyListedToggle;
