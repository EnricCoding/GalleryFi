'use client';

import { memo } from 'react';

export type SortValue = 'newest' | 'price_asc' | 'price_desc';

type Props = {
    value: SortValue;
    onChange: (v: SortValue) => void;
};

const SortSelect = memo(function SortSelect({ value, onChange }: Props) {
    return (
        <label className="inline-flex items-center gap-2">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Sort</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as SortValue)}
                className="text-sm rounded-lg border border-neutral-300 dark:border-neutral-700
                   bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100
                   px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30"
                aria-label="Sort listings"
            >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
            </select>
        </label>
    );
});

export default SortSelect;
