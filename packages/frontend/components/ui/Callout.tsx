'use client';

import React from 'react';
type Variant = 'neutral' | 'warning' | 'error' | 'success';

export default function Callout({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: Variant }) {
    const cls =
        variant === 'warning'
            ? 'bg-warning/10 border-warning text-warning'
            : variant === 'error'
                ? 'bg-error/10 border-error text-error'
                : variant === 'success'
                    ? 'bg-success/10 border-success text-success'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200';
    return <div className={`text-sm border rounded p-3 ${cls}`}>{children}</div>;
}
