// NftInfoActionBar.tsx
'use client';

import React from 'react';

type Props = {
    isForSale: boolean;
    formattedPrice: string | null;
    lastPrice: number | null;
    showBuyButton: boolean;
    showListButton: boolean;
    showOfferDisabled: boolean;

    // NUEVO (editar precio + cancelar)
    showCancelButton?: boolean;
    showEditButton?: boolean;
    onCancelClick?: () => void;
    onEditClick?: () => void;
    isCancelBusy?: boolean;
    isEditBusy?: boolean;

    onBuyClick: () => void;
    onListClick: () => void;
    isBuying: boolean;
    isListingBusy: boolean;
};

export default function NftInfoActionBar({
    isForSale,
    formattedPrice,
    lastPrice,
    showBuyButton,
    showListButton,
    showOfferDisabled,
    showCancelButton,
    showEditButton,
    onCancelClick,
    onEditClick,
    isCancelBusy,
    isEditBusy,
    onBuyClick,
    onListClick,
    isBuying,
    isListingBusy,
}: Props) {
    return (
        <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
                {isForSale ? (
                    <>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Price</p>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                {formattedPrice} ETH
                            </span>
                            {lastPrice !== null && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Last sale: {lastPrice.toFixed(4)} ETH
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">Not listed</span>
                            {lastPrice !== null && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Last sale: {lastPrice.toFixed(4)} ETH
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="flex gap-3 flex-wrap">
                {showBuyButton && (
                    <button
                        onClick={onBuyClick}
                        disabled={isBuying}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        aria-label="Buy NFT now"
                    >
                        {isBuying ? 'Buying…' : 'Buy Now'}
                    </button>
                )}

                {showListButton && (
                    <button
                        onClick={onListClick}
                        disabled={isListingBusy}
                        className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        aria-label="List NFT for sale"
                    >
                        {isListingBusy ? 'Listing…' : 'List for Sale'}
                    </button>
                )}

                {showEditButton && (
                    <button
                        onClick={onEditClick}
                        disabled={!!isEditBusy}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        aria-label="Change price"
                    >
                        {isEditBusy ? 'Changing…' : 'Change Price'}
                    </button>
                )}

                {showCancelButton && (
                    <button
                        onClick={onCancelClick}
                        disabled={!!isCancelBusy}
                        className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        aria-label="Cancel listing"
                    >
                        {isCancelBusy ? 'Cancelling…' : 'Cancel listing'}
                    </button>
                )}

                {showOfferDisabled && (
                    <button
                        disabled
                        className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-2xl opacity-50 cursor-not-allowed"
                        aria-label="Make offer (coming soon)"
                    >
                        Make Offer
                    </button>
                )}
            </div>
        </div>
    );
}
