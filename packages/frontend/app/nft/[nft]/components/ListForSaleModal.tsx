'use client';

import React, { memo, useEffect, useMemo, useRef, useCallback, useState } from 'react';

// Enhanced types
interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    value: string;
    setValue: (v: string) => void;
    error: string | null;
    busyApprove: boolean;
    busyList: boolean;
    title?: string;
    confirmLabel?: string;
    nftName?: string;
    currentPrice?: string;
}

// Price presets for better UX
const PRICE_PRESETS = [
    { value: '0.001', label: '0.001 ETH', description: 'Starter' },
    { value: '0.01', label: '0.01 ETH', description: 'Common' },
    { value: '0.1', label: '0.1 ETH', description: 'Premium' },
    { value: '0.5', label: '0.5 ETH', description: 'High Value' },
    { value: '1', label: '1 ETH', description: 'Elite' },
] as const;

// Enhanced validation
interface ValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
    suggestion?: string;
}

function validatePrice(value: string): ValidationResult {
    const trimmed = value.trim();

    if (!trimmed) {
        return { isValid: false, error: 'Price is required' };
    }

    const num = Number(trimmed);

    if (!Number.isFinite(num)) {
        return { isValid: false, error: 'Please enter a valid number' };
    }

    if (num <= 0) {
        return { isValid: false, error: 'Price must be greater than 0' };
    }

    if (num < 0.0001) {
        return {
            isValid: false,
            error: 'Price too low',
            suggestion: 'Minimum recommended: 0.0001 ETH'
        };
    }

    if (num > 10000) {
        return {
            isValid: false,
            error: 'Price too high',
            suggestion: 'Please verify this amount is correct'
        };
    }

    if (num < 0.001) {
        return {
            isValid: true,
            warning: 'Very low price - consider gas costs'
        };
    }

    if (num > 100) {
        return {
            isValid: true,
            warning: 'High value - double check amount'
        };
    }

    return { isValid: true };
}

const ListForSaleModal = memo(function ListForSaleModal({
    open,
    onClose,
    onConfirm,
    value,
    setValue,
    error,
    busyApprove,
    busyList,
    title = 'List for Sale',
    confirmLabel,
    nftName,
    currentPrice,
}: Props) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [showPresets, setShowPresets] = useState(false);

    const busy = busyApprove || busyList;

    // Enhanced validation with all edge cases
    const validation = useMemo(() => validatePrice(value), [value]);

    const finalConfirm = useMemo(() => {
        if (confirmLabel) return confirmLabel;
        if (busyApprove) return 'Approving...';
        if (busyList) return 'Listing...';
        return 'Confirm Listing';
    }, [confirmLabel, busyApprove, busyList]);

    const isConfirmDisabled = busy || !validation.isValid;

    // Auto-focus when modal opens
    useEffect(() => {
        if (open && inputRef.current) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) {
                onClose();
            } else if (e.key === 'Enter' && e.metaKey && !isConfirmDisabled) {
                onConfirm();
            }
        };

        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, [open, busy, isConfirmDisabled, onClose, onConfirm]);

    const handlePresetSelect = useCallback((presetValue: string) => {
        setValue(presetValue);
        setSelectedPreset(presetValue);
        setShowPresets(false);
    }, [setValue]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);

        if (selectedPreset && newValue !== selectedPreset) {
            setSelectedPreset(null);
        }
    }, [setValue, selectedPreset]);

    const handleFormSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!isConfirmDisabled) {
            onConfirm();
        }
    }, [isConfirmDisabled, onConfirm]);

    const estimatedUSD = useMemo(() => {
        const ethPrice = 2400; 
        const numValue = Number(value);
        if (!Number.isFinite(numValue) || numValue <= 0) return null;
        return (numValue * ethPrice).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }, [value]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="list-modal-title"
            aria-describedby="list-modal-desc"
        >
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => {
                    if (!busy) onClose();
                }}
            />

            <div className="relative bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200/60 dark:border-gray-700/60 animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-6 border-b border-gray-200/60 dark:border-gray-700/60 rounded-t-3xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3
                                id="list-modal-title"
                                className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
                            >
                                {title}
                            </h3>
                            {nftName && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {nftName}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => !busy && onClose()}
                            disabled={busy}
                            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors disabled:opacity-50"
                            aria-label="Close modal"
                        >
                            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                    {currentPrice && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                                Current listed price
                            </p>
                            <p className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                                {currentPrice} ETH
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="price-input"
                                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                                Listing Price
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPresets(!showPresets)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                            >
                                {showPresets ? 'Hide' : 'Show'} presets
                            </button>
                        </div>

                        {showPresets && (
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {PRICE_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        onClick={() => handlePresetSelect(preset.value)}
                                        className={`p-3 rounded-xl border transition-all duration-200 text-center ${selectedPreset === preset.value
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                            }`}
                                    >
                                        <div className="text-sm font-semibold">{preset.label}</div>
                                        <div className="text-xs opacity-70">{preset.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <input
                                id="price-input"
                                ref={inputRef}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.0001"
                                placeholder="0.0100"
                                value={value}
                                onChange={handleInputChange}
                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                className={`w-full rounded-2xl border-2 px-4 py-4 text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 ${error || !validation.isValid
                                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:border-red-400'
                                        : validation.warning
                                            ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20 dark:border-amber-500'
                                            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
                                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
                                aria-invalid={!!error || !validation.isValid}
                                aria-describedby="price-help price-error"
                            />

                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                                ETH
                            </div>
                        </div>

                        {estimatedUSD && validation.isValid && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span className="text-gray-400">≈</span>
                                <span className="font-medium">{estimatedUSD}</span>
                                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">USD estimate</span>
                            </p>
                        )}

                        <p
                            id="price-help"
                            className="text-xs text-gray-500 dark:text-gray-400"
                        >
                            Set your desired listing price in ETH. You can change this later.
                        </p>

                        {(error || !validation.isValid || validation.warning) && (
                            <div className="space-y-2">
                                {error && (
                                    <p id="price-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {error}
                                    </p>
                                )}

                                {!error && !validation.isValid && validation.error && (
                                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {validation.error}
                                        {validation.suggestion && (
                                            <span className="text-xs opacity-75">({validation.suggestion})</span>
                                        )}
                                    </p>
                                )}

                                {validation.warning && (
                                    <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        {validation.warning}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Enhanced action buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="flex-1 px-6 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isConfirmDisabled}
                            className="flex-1 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white font-bold transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {busy ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {finalConfirm}
                                </div>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {finalConfirm}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Keyboard shortcut hint */}
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                        Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> to cancel,
                        <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs ml-1">⌘ + Enter</kbd> to confirm
                    </p>
                </form>
            </div>
        </div>
    );
});

export default ListForSaleModal;
