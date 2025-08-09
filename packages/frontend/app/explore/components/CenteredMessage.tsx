'use client';

export default function CenteredMessage({
    children,
    variant = 'neutral',
}: {
    children: React.ReactNode;
    variant?: 'neutral' | 'error';
}) {
    const color =
        variant === 'error'
            ? 'text-error'
            : 'text-neutral-700 dark:text-neutral-300';

    return (
        <div className="min-h-[60vh] grid place-items-center px-6">
            <div className={color}>{children}</div>
        </div>
    );
}
