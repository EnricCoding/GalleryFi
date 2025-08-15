'use client';

interface StatusBadgeProps {
    status: 'listed' | 'auction' | 'unlisted';
    label: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
    const getStatusStyles = () => {
        switch (status) {
            case 'listed':
                return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700';
            case 'auction':
                return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700';
            case 'unlisted':
            default:
                return 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600';
        }
    };

    const getDotColor = () => {
        switch (status) {
            case 'listed':
                return 'bg-emerald-500';
            case 'auction':
                return 'bg-orange-500';
            case 'unlisted':
            default:
                return 'bg-gray-400';
        }
    };

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${getStatusStyles()}`}>
            <div className={`w-2 h-2 rounded-full ${getDotColor()} ${status !== 'unlisted' ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}
