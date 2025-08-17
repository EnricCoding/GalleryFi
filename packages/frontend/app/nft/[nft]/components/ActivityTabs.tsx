'use client';

import { NftActivity } from '@/lib/types/activity';
import { useState, useMemo, useCallback } from 'react';
import { formatEther } from 'viem';

interface ActivityTabsProps {
    activity: NftActivity[];
    isNewlyCreated?: boolean;
}

type TabId = 'activity' | 'offers' | 'history';

interface TabConfig {
    id: TabId;
    label: string;
    count: number;
}

// Activity type configurations
const ACTIVITY_CONFIG = {
    SALE: {
        label: 'Sale',
        icon: (
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
            </div>
        )
    },
    LISTING: {
        label: 'Listing',
        icon: (
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
            </div>
        )
    },
    TRANSFER: {
        label: 'Transfer',
        icon: (
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
            </div>
        )
    },
    BID: {
        label: 'Bid',
        icon: (
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2" />
                </svg>
            </div>
        )
    }
} as const;

const DEFAULT_ACTIVITY_ICON = (
    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    </div>
);

export default function ActivityTabs({ activity, isNewlyCreated }: ActivityTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('activity');

    // Memoized utility functions
    const formatAddress = useCallback((address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }, []);

    const formatTime = useCallback((timestamp: string) => {
        const date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    // Memoized activity filters
    const salesHistory = useMemo(() =>
        activity.filter(item => item.activityType === 'SALE'),
        [activity]
    );

    // Memoized tab configuration
    const tabs: TabConfig[] = useMemo(() => [
        { id: 'activity', label: 'Activity', count: activity.length },
        { id: 'offers', label: 'Offers', count: 0 },
        { id: 'history', label: 'History', count: salesHistory.length }
    ], [activity.length, salesHistory.length]);

    const getActivityIcon = useCallback((type: string) => {
        return ACTIVITY_CONFIG[type as keyof typeof ACTIVITY_CONFIG]?.icon || DEFAULT_ACTIVITY_ICON;
    }, []);

    const getActivityLabel = useCallback((type: string) => {
        return ACTIVITY_CONFIG[type as keyof typeof ACTIVITY_CONFIG]?.label || type;
    }, []);

    // Reusable empty state component
    const EmptyState = useCallback(({
        icon,
        title,
        description
    }: {
        icon: React.ReactNode;
        title: string;
        description: string;
    }) => (
        <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                {icon}
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{description}</p>
        </div>
    ), []);

    // Reusable activity item component
    const ActivityItem = useCallback(({ item, showType = true }: { item: NftActivity; showType?: boolean }) => (
        <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
            {getActivityIcon(item.activityType)}

            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                            {showType ? getActivityLabel(item.activityType) : 'Sale'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            {item.from && <span>From: {formatAddress(item.from)}</span>}
                            {item.to && (
                                <>
                                    <span>→</span>
                                    <span>To: {formatAddress(item.to)}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="text-right">
                        {item.price && (
                            <p className="font-bold text-gray-900 dark:text-white">
                                {formatEther(BigInt(item.price))} ETH
                            </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatTime(item.timestamp)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    ), [getActivityIcon, getActivityLabel, formatAddress, formatTime]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${activeTab === tab.id
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                            <span className="ml-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'activity' && (
                    <div className="space-y-4">
                        {activity.length > 0 ? (
                            activity.map((item) => (
                                <ActivityItem key={item.id} item={item} />
                            ))
                        ) : (
                            <EmptyState
                                icon={
                                    isNewlyCreated ? (
                                        <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    )
                                }
                                title={isNewlyCreated ? "Loading activity..." : "No activity yet"}
                                description={isNewlyCreated ? "Your NFT data is being indexed. This may take a few moments." : "Activity will appear here when it occurs"}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'offers' && (
                    <EmptyState
                        icon={
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        }
                        title="No offers"
                        description="Offers will appear here"
                    />
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {salesHistory.length > 0 ? (
                            salesHistory.map((item) => (
                                <ActivityItem key={item.id} item={item} showType={false} />
                            ))
                        ) : (
                            <EmptyState
                                icon={
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                }
                                title="No sales history"
                                description="Sales history will appear here"
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
