'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { useBidAuction, BID_PRESETS, type BidPreset } from '@/hooks/useBidValue';
import { useEthUsd } from '@/hooks/useEthUsd';

type Props = {
    open: boolean;
    onClose: () => void;
    nft: `0x${string}`;
    tokenId: string | number | bigint;
    currentBidWei?: bigint;
    auctionEndTime?: number;
    onBidded?: (txHash: `0x${string}`, bidAmount: bigint) => void;
    onStatus?: (status: string, type?: 'info' | 'success' | 'error') => void;
};

// Utility function to format USD
const formatUsd = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

// Utility function to convert ETH to USD
const ethToUsd = (ethAmount: string | number, ethPrice: number | null): string => {
    if (!ethPrice || !ethAmount) return '$0.00';
    const eth = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
    return formatUsd(eth * ethPrice);
};

// Step configuration for visual feedback
const STEP_CONFIG = {
    idle: { label: 'Ready to Bid', icon: '🎯', color: 'text-gray-500' },
    bidding: { label: 'Processing Bid', icon: '⚡', color: 'text-blue-500' },
    success: { label: 'Bid Placed!', icon: '🎉', color: 'text-green-500' },
    error: { label: 'Error', icon: '❌', color: 'text-red-500' },
} as const;

const PlaceBidModal = memo(function PlaceBidModal({
    open,
    onClose,
    nft,
    tokenId,
    currentBidWei,
    auctionEndTime,
    onBidded,
    onStatus,
}: Props) {
    // Enhanced hook integration
    const {
        // Modal state from hook
        open: hookOpen,
        openModal,
        closeModal,

        // Bid management
        bidInput,
        setBidInput,
        selectedPreset,
        setSelectedPreset,
        usePresetIncrement,
        setUsePresetIncrement,

        // Process state
        currentStep,
        error,
        txHash,

        // Computed properties
        minBidEth,
        suggestedBidWei,
        suggestedBidEth,

        // Balance checking
        userBalance,
        userBalanceEth,
        canBid,

        // Auction state
        timeRemaining,
        isAuctionEnded,

        // Actions
        confirmBid,
        fillSuggestedBid,
    } = useBidAuction({
        nft,
        tokenId,
        currentBidWei,
        auctionEndTime,
        onBidded,
        onStatus,
    });

    // USD conversion hook
    const { ethUsd } = useEthUsd();
    
    // Local state for USD input mode
    const [inputMode, setInputMode] = useState<'eth' | 'usd'>('eth');
    const [usdCustomAmount, setUsdCustomAmount] = useState<string>('');

    // Handle USD input conversion
    const handleUsdInput = (usdValue: string) => {
        setUsdCustomAmount(usdValue);
        if (!ethUsd || !usdValue) {
            setBidInput('');
            return;
        }
        
        const usdNum = parseFloat(usdValue);
        if (!isNaN(usdNum)) {
            const ethEquivalent = (usdNum / ethUsd).toFixed(6);
            setBidInput(ethEquivalent);
        }
    };

    // Handle ETH input conversion (update USD display)
    const handleEthInput = (ethValue: string) => {
        setBidInput(ethValue);
        if (!ethUsd || !ethValue) {
            setUsdCustomAmount('');
            return;
        }
        
        const ethNum = parseFloat(ethValue);
        if (!isNaN(ethNum)) {
            const usdEquivalent = (ethNum * ethUsd).toFixed(2);
            setUsdCustomAmount(usdEquivalent);
        }
    };

    // Sync USD amount when bid input changes
    useEffect(() => {
        if (inputMode === 'eth' && bidInput && ethUsd) {
            const ethNum = parseFloat(bidInput);
            if (!isNaN(ethNum)) {
                const usdEquivalent = (ethNum * ethUsd).toFixed(2);
                setUsdCustomAmount(usdEquivalent);
            }
        }
    }, [bidInput, ethUsd, inputMode]);

    // Sync external open state with hook modal state
    useEffect(() => {
        if (open && !hookOpen) {
            openModal();
        } else if (!open && hookOpen) {
            closeModal();
        }
    }, [open, hookOpen, openModal, closeModal]);

    // Real-time countdown state
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update time every second for real-time countdown
    useEffect(() => {
        if (!auctionEndTime || isAuctionEnded) return;

        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [auctionEndTime, isAuctionEnded]);

    // Calculate real-time remaining time
    const realTimeRemaining = useMemo(() => {
        if (!auctionEndTime) return null;
        const endTimeMs = auctionEndTime * 1000; // Convert to milliseconds
        const remaining = Math.max(0, Math.floor((endTimeMs - currentTime) / 1000));
        return remaining;
    }, [auctionEndTime, currentTime]);

    // Calculate bid amount from input
    const bidAmountWei = useMemo(() => {
        try {
            if (!bidInput.trim()) return BigInt(0);
            return parseEther(bidInput.trim());
        } catch {
            return BigInt(0);
        }
    }, [bidInput]);

    const bidAmountEth = useMemo(() => {
        if (bidAmountWei === BigInt(0)) return '';
        return formatEther(bidAmountWei);
    }, [bidAmountWei]);

    const stepConfig = STEP_CONFIG[currentStep] || STEP_CONFIG.idle;

    const handleClose = () => {
        if (currentStep !== 'bidding') {
            closeModal();
            onClose();
        }
    };

    const handleConfirmBid = () => {
        confirmBid();
    };

    // Calculate time remaining display
    const timeDisplay = useMemo(() => {
        const timeToUse = realTimeRemaining !== null ? realTimeRemaining : timeRemaining;
        
        if (!timeToUse || timeToUse <= 0) return 'Auction ended';

        const hours = Math.floor(timeToUse / 3600);
        const minutes = Math.floor((timeToUse % 3600) / 60);
        const seconds = timeToUse % 60;

        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s left`;
        if (minutes > 0) return `${minutes}m ${seconds}s left`;
        return `${seconds}s left`;
    }, [realTimeRemaining, timeRemaining]);

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
                        Place a Bid 🎯
                    </h3>
                    <button
                        onClick={handleClose}
                        disabled={currentStep === 'bidding'}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                    >
                        <span className="text-xl">✕</span>
                    </button>
                </div>

                {/* Auction Status */}
                {(realTimeRemaining !== null || timeRemaining !== undefined) && (
                    <div className={`mb-4 p-3 rounded-xl border ${isAuctionEnded || (realTimeRemaining !== null ? realTimeRemaining <= 0 : false)
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : (realTimeRemaining !== null ? realTimeRemaining < 300 : timeRemaining !== null && timeRemaining < 300)
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}>
                        <div className={`flex items-center gap-2 ${isAuctionEnded || (realTimeRemaining !== null ? realTimeRemaining <= 0 : false)
                                ? 'text-red-800 dark:text-red-200'
                                : (realTimeRemaining !== null ? realTimeRemaining < 300 : timeRemaining !== null && timeRemaining < 300)
                                    ? 'text-orange-800 dark:text-orange-200'
                                    : 'text-blue-800 dark:text-blue-200'
                            }`}>
                            <span>{isAuctionEnded || (realTimeRemaining !== null ? realTimeRemaining <= 0 : false) ? '⏰' : (realTimeRemaining !== null ? realTimeRemaining < 300 : timeRemaining !== null && timeRemaining < 300) ? '🔥' : '⌛'}</span>
                            <span className="text-sm font-medium">{timeDisplay}</span>
                        </div>
                    </div>
                )}

                {/* DEBUG: Check for stray values */}
                {/* Remove this after debugging */}
                
                {/* Progress Indicator */}
                {currentStep !== 'idle' && (
                    <div className="mb-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 ${stepConfig.color}`}>
                            <span className="text-base">{stepConfig.icon}</span>
                            {stepConfig.label}
                            {currentStep === 'bidding' && <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}
                        </div>
                    </div>
                )}

                {/* Current Bid Info */}
                {currentBidWei && currentBidWei > BigInt(0) && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Highest Bid</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatEther(currentBidWei)} ETH
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {ethToUsd(formatEther(currentBidWei), ethUsd)}
                        </div>
                    </div>
                )}

                {/* Bid Input Section */}
                <div className="space-y-4 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        💰 Your Bid Amount
                    </h4>

                    {/* Bid Mode Toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setUsePresetIncrement(true)}
                            disabled={currentStep === 'bidding'}
                            className={`flex-1 py-2 px-3 rounded-xl border transition-all text-sm font-medium disabled:opacity-50 ${usePresetIncrement
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                }`}
                        >
                            🎯 Quick Bid
                        </button>
                        <button
                            type="button"
                            onClick={() => setUsePresetIncrement(false)}
                            disabled={currentStep === 'bidding'}
                            className={`flex-1 py-2 px-3 rounded-xl border transition-all text-sm font-medium disabled:opacity-50 ${!usePresetIncrement
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                }`}
                        >
                            ✏️ Custom Bid
                        </button>
                    </div>

                    {/* Quick Bid Presets */}
                    {usePresetIncrement && (
                        <div className="space-y-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Choose increment amount:
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(BID_PRESETS).map(([key, preset]) => {
                                    const presetEthAmount = parseFloat(preset.increment);
                                    const presetUsdAmount = ethToUsd(presetEthAmount, ethUsd);
                                    
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setSelectedPreset(key as BidPreset);
                                                // Apply the bid immediately when preset is selected
                                                fillSuggestedBid();
                                            }}
                                            disabled={currentStep === 'bidding'}
                                            className={`p-3 rounded-xl border-2 transition-all text-sm font-medium disabled:opacity-50 ${selectedPreset === key
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            <div className="font-semibold">⬆️ {preset.label}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {presetUsdAmount}
                                            </div>
                                            {selectedPreset === key && suggestedBidEth && (
                                                <div className="text-xs mt-1 text-green-600 dark:text-green-400">
                                                    ✓ Applied: {suggestedBidEth} ETH
                                                    <br />
                                                    ({ethToUsd(suggestedBidEth, ethUsd)})
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Auto-apply suggestion when preset is selected */}
                            {selectedPreset && suggestedBidWei > BigInt(0) && (
                                <div className="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                                ✅ Bid Applied Automatically
                                            </div>
                                            <div className="text-xs text-green-600 dark:text-green-400">
                                                Current bid + {BID_PRESETS[selectedPreset as BidPreset]?.label}
                                            </div>
                                        </div>
                                        <div className="text-lg font-bold text-green-900 dark:text-green-100">
                                            {suggestedBidEth} ETH
                                            <div className="text-sm font-normal text-green-700 dark:text-green-300">
                                                {ethToUsd(suggestedBidEth, ethUsd)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-green-700 dark:text-green-300 text-center">
                                        Ready to place bid! Click 🎯 Place Bid below.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Bid Input */}
                    {!usePresetIncrement && (
                        <div className="space-y-3">
                            {/* Currency toggle */}
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Bid Amount
                                    {minBidEth && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            (min: {minBidEth} ETH / {ethToUsd(minBidEth, ethUsd)})
                                        </span>
                                    )}
                                </label>
                                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setInputMode('eth')}
                                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${inputMode === 'eth'
                                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        ETH
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInputMode('usd')}
                                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${inputMode === 'usd'
                                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        USD
                                    </button>
                                </div>
                            </div>

                            {/* Input field */}
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step={inputMode === 'eth' ? '0.0001' : '0.01'}
                                    placeholder={inputMode === 'eth' ? `${minBidEth || '0.001'}` : '10.00'}
                                    value={inputMode === 'eth' ? bidInput : usdCustomAmount}
                                    onChange={(e) => {
                                        if (inputMode === 'eth') {
                                            handleEthInput(e.target.value);
                                        } else {
                                            handleUsdInput(e.target.value);
                                        }
                                    }}
                                    disabled={currentStep === 'bidding'}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 pr-16 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {inputMode === 'eth' ? 'ETH' : 'USD'}
                                </div>
                            </div>

                            {/* Live conversion display */}
                            {bidInput && ethUsd && (
                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {inputMode === 'eth' ? (
                                            <>≈ {ethToUsd(bidInput, ethUsd)}</>
                                        ) : (
                                            <>≈ {bidInput} ETH</>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bid Summary */}
                {(bidAmountWei > BigInt(0) || (usePresetIncrement && suggestedBidWei > BigInt(0))) && (
                    <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                Your Bid:
                            </span>
                            <div className="text-right">
                                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                    {usePresetIncrement && suggestedBidWei > BigInt(0) 
                                        ? suggestedBidEth 
                                        : bidAmountEth} ETH
                                </div>
                                <div className="text-sm text-purple-700 dark:text-purple-300">
                                    {ethToUsd(
                                        usePresetIncrement && suggestedBidWei > BigInt(0) 
                                            ? suggestedBidEth 
                                            : bidAmountEth, 
                                        ethUsd
                                    )}
                                </div>
                            </div>
                        </div>

                        {userBalanceEth && (
                            <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400">
                                <span>Wallet Balance:</span>
                                <div className="text-right">
                                    <div>{userBalanceEth} ETH</div>
                                    <div className="text-purple-500 dark:text-purple-400">
                                        {ethToUsd(userBalanceEth, ethUsd)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Balance Warning */}
                {userBalance !== undefined && bidAmountWei > userBalance && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                            <span>⚠️</span>
                            <span className="text-sm font-medium">Insufficient balance for this bid</span>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                            <span>❌</span>
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    </div>
                )}

                {/* Success Display */}
                {currentStep === 'success' && txHash && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                            <span>🎉</span>
                            <span className="text-sm font-medium">Bid placed successfully!</span>
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
                        disabled={currentStep === 'bidding'}
                        className="px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {currentStep === 'success' ? 'Close' : 'Cancel'}
                    </button>

                    {currentStep !== 'success' && (
                        <button
                            type="button"
                            onClick={handleConfirmBid}
                            disabled={!canBid || currentStep === 'bidding' || isAuctionEnded}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {currentStep === 'bidding' && '⚡ Bidding...'}
                            {(currentStep === 'idle' || currentStep === 'error') && '🎯 Place Bid'}
                        </button>
                    )}
                </div>

                {/* Additional Info */}
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    💡 Your bid will be locked until auction ends
                </div>
            </div>
        </div>
    );
});

export default PlaceBidModal;
