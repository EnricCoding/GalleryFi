// components/ProceedsWidget.tsx
'use client';

import { useState, useEffect, memo } from 'react';
import { useProceeds } from '@/hooks/useProceeds';

type Props = {
    onNotify?: (msg: string, kind?: 'info' | 'success' | 'error') => void;
    variant?: 'pill' | 'card';
    showTooltip?: boolean;
};

const ProceedsWidget = memo(function ProceedsWidget({ 
    onNotify, 
    variant = 'pill', 
    showTooltip = true 
}: Props) {
    const [localMsg, setLocalMsg] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const notify = (msg: string) => {
        setLocalMsg(msg);
        onNotify?.(msg, msg.startsWith('✅') ? 'success' : msg.startsWith('⚠️') ? 'error' : 'info');
    };

    const { 
        balanceEth, 
        balanceWei, 
        loadingBalance, 
        busyWithdraw, 
        hasProceeds,
        canWithdraw,
        withdraw 
    } = useProceeds({
        onStatus: notify,
        onSuccess: (amount) => {
            const ethAmount = (Number(amount) / 1e18).toFixed(4);
            notify(`✅ Successfully withdrawn ${ethAmount} ETH!`);
        },
    });

    useEffect(() => {
        if (!localMsg) return;
        const t = setTimeout(() => setLocalMsg(null), 4000); // Aumentado a 4 segundos
        return () => clearTimeout(t);
    }, [localMsg]);

    // Formatear balance con más precisión
    const formatBalance = (balance: string) => {
        const num = parseFloat(balance);
        if (num === 0) return '0.0000';
        if (num < 0.0001) return '<0.0001';
        return num.toFixed(4);
    };

    const formattedBalance = formatBalance(balanceEth);
    
    // Tooltip content
    const getTooltipText = () => {
        if (!hasProceeds) return 'No proceeds available to withdraw';
        if (busyWithdraw) return 'Withdrawal in progress...';
        if (!canWithdraw) return 'Connect wallet to withdraw proceeds';
        return `Click to withdraw ${formattedBalance} ETH`;
    };

    // Loading skeleton component
    const LoadingSkeleton = () => (
        <div className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded h-4 w-16" />
    );

    // Status indicator
    const StatusIndicator = ({ show }: { show: boolean }) => (
        show ? (
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 dark:text-green-400">Active</span>
            </div>
        ) : null
    );

    if (variant === 'card') {
        return (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 transition-all duration-200 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-600">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                Available Proceeds
                            </p>
                            <StatusIndicator show={hasProceeds} />
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                            {loadingBalance ? (
                                <LoadingSkeleton />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                                        {formattedBalance}
                                    </p>
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">ETH</span>
                                    {balanceWei > 0 && (
                                        <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                            (≈${((parseFloat(balanceEth) * 2500)).toFixed(2)})
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                        
                        {localMsg && (
                            <div className="mt-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-700/50">
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">{localMsg}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={withdraw}
                            disabled={!canWithdraw}
                            title={showTooltip ? getTooltipText() : undefined}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className="px-6 py-2.5 rounded-lg bg-accent text-white font-medium 
                                     disabled:opacity-50 disabled:cursor-not-allowed 
                                     hover:bg-accent-dark hover:scale-105 
                                     active:scale-95 transition-all duration-200
                                     focus:outline-none focus:ring-2 focus:ring-accent/50"
                        >
                            {busyWithdraw ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                                    </svg>
                                    Withdrawing…
                                </span>
                            ) : (
                                'Withdraw'
                            )}
                        </button>
                        
                        {hasProceeds && (
                            <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
                                Available to withdraw
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // pill (ideal navbar)
    return (
        <div 
            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 dark:border-neutral-700 
                       bg-white dark:bg-neutral-800 px-4 py-2 transition-all duration-200 
                       hover:shadow-md hover:border-neutral-400 dark:hover:border-neutral-600"
            title={showTooltip ? getTooltipText() : undefined}
        >
            <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Proceeds:
                </span>
                {loadingBalance ? (
                    <div className="w-12 h-3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                ) : (
                    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {formattedBalance} ETH
                    </span>
                )}
                {hasProceeds && !loadingBalance && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
            </div>
            
            <button
                type="button"
                onClick={withdraw}
                disabled={!canWithdraw}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="ml-1 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         hover:bg-accent-dark hover:scale-105 active:scale-95 
                         transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
                {busyWithdraw ? (
                    <span className="flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                        </svg>
                        <span className="hidden sm:inline">Withdrawing…</span>
                    </span>
                ) : (
                    <>
                        <span className="hidden sm:inline">Withdraw</span>
                        <span className="sm:hidden">💰</span>
                    </>
                )}
            </button>
            
            {/* Tooltip for mobile */}
            {isHovered && showTooltip && (
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 
                               px-3 py-2 bg-neutral-900 text-white text-xs rounded-md 
                               whitespace-nowrap z-50 shadow-lg">
                    {getTooltipText()}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 
                                   border-4 border-transparent border-b-neutral-900"></div>
                </div>
            )}
        </div>
    );
});

export default ProceedsWidget;
