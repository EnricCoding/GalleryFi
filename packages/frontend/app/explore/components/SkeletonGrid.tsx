'use client';

export default function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-lg overflow-hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                    <div className="h-48 bg-neutral-200/70 dark:bg-neutral-700/60 animate-pulse" />
                    <div className="p-4 space-y-3">
                        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                        <div className="h-3 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
}
