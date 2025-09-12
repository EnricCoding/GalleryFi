'use client';

import { memo } from 'react';
import { useCreateAuction, DURATION_PRESETS, type DurationPreset } from '@/hooks/useCreateAuction';

type Props = {
    open: boolean;
    onClose: () => void;
    nft: `0x${string}`;
    tokenId: string | number | bigint;
    isOwner?: boolean;
    onCreated?: (txHash: `0x${string}`) => void;
    onStatus?: (status: string, type?: 'info' | 'success' | 'error') => void;
};

const CreateAuctionModal = memo(function CreateAuctionModal({
    open,
    onClose,
    nft,
    tokenId,
    isOwner = false,
    onCreated,
    onStatus,
}: Props) {
    const {
        durationHours,
        setDurationHours,

        // Process state
        currentStep,
        isProcessing,
        isSuccess,
        hasError,
        error,
        txHash,

        // Actions
        confirmCreate,

        // Computed properties
        canCreate,
    } = useCreateAuction({
        nft,
        tokenId,
        isOwner,
        onCreated,
        onStatus,
    });

    // Updated step config to match actual hook steps
    const stepConfigMap = {
        idle: { label: 'Ready', icon: '⏱️', color: 'text-gray-500' },
        approval: { label: 'Approving NFT', icon: '✅', color: 'text-purple-500' },
        creating: { label: 'Creating Auction', icon: '⚡', color: 'text-blue-500' },
        success: { label: 'Success!', icon: '🎉', color: 'text-green-500' },
        error: { label: 'Error', icon: '❌', color: 'text-red-500' },
    } as const;

    const currentStepConfig = stepConfigMap[currentStep] || stepConfigMap.idle;

    const handleCreateAuction = () => {
        confirmCreate();
    };

    const handleClose = () => {
        if (!isProcessing) {
            onClose();
        }
    };

    // Calculate duration display
    const durationValue = DURATION_PRESETS[durationHours];
    const durationInDays = durationValue ? Math.round(durationValue.hours / 24 * 10) / 10 : 0;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
                onClick={handleClose}
            />

            <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200/60 dark:border-gray-700/60 transform transition-all duration-200 scale-100">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Create Auction ⚡
                    </h3>
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                    >
                        <span className="text-xl">✕</span>
                    </button>
                </div>

                {/* Progress Indicator */}
                {currentStep !== 'idle' && (
                    <div className="mb-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 ${currentStepConfig.color}`}>
                            <span className="text-base">{currentStepConfig.icon}</span>
                            {currentStepConfig.label}
                            {isProcessing && <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}
                        </div>
                    </div>
                )}

                {/* Duration Selection */}
                <div className="space-y-4 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        📅 Auction Duration
                    </h4>

                    {/* Preset Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(DURATION_PRESETS).map(([key, preset]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setDurationHours(key as DurationPreset)}
                                disabled={isProcessing}
                                className={`p-3 rounded-xl border-2 transition-all text-sm font-medium disabled:opacity-50 ${durationHours === key
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <div>⏰ {preset.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Current Selection Display */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Selected Duration:
                        </span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {durationValue ? `${durationValue.hours}h` : '---'}
                        </span>
                    </div>
                    {durationValue && durationValue.hours > 24 && (
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            ≈ {durationInDays} days
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {hasError && error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                            <span>❌</span>
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    </div>
                )}

                {/* Success Display */}
                {isSuccess && txHash && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                            <span>🎉</span>
                            <span className="text-sm font-medium">Auction created successfully!</span>
                        </div>
                        <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-mono break-all">
                            Tx: {txHash.slice(0, 20)}...{txHash.slice(-10)}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSuccess ? 'Close' : 'Cancel'}
                    </button>

                    {!isSuccess && (
                        <button
                            type="button"
                            onClick={handleCreateAuction}
                            disabled={!canCreate || isProcessing}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {currentStep === 'approval' && '✅ Approving...'}
                            {currentStep === 'creating' && '⚡ Creating...'}
                            {(currentStep === 'idle' || currentStep === 'error') && '🚀 Create Auction'}
                        </button>
                    )}
                </div>

                {/* Additional Info */}
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    💡 Your NFT will be locked during the auction period
                </div>
            </div>
        </div>
    );
});

export default CreateAuctionModal;
