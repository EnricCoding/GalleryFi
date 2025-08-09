'use client';

type Toast = { id: number; kind: 'info' | 'success' | 'error'; msg: string; sticky?: boolean };

export function ToastStack({
    toasts,
    onDismiss,
}: {
    toasts: Toast[];
    onDismiss: (id: number) => void;
}) {
    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={[
                        'rounded-xl shadow-lg px-4 py-3 border text-sm backdrop-blur',
                        t.kind === 'success'
                            ? 'bg-neutral-50/90 dark:bg-neutral-800/80 border-success text-success'
                            : t.kind === 'error'
                                ? 'bg-neutral-50/90 dark:bg-neutral-800/80 border-error text-error'
                                : 'bg-neutral-50/90 dark:bg-neutral-800/80 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100',
                    ].join(' ')}
                >
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5">{t.kind === 'success' ? '✅' : t.kind === 'error' ? '⚠️' : 'ℹ️'}</span>
                        <div className="flex-1">{t.msg}</div>
                        <button
                            onClick={() => onDismiss(t.id)}
                            className="ml-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
                            aria-label="Dismiss"
                            title="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function useToasts() {
    type T = Toast;
    const state: { current: T[] } = { current: [] };

    return {
        get: () => state.current,
        set: (next: T[]) => (state.current = next),
    };
}
