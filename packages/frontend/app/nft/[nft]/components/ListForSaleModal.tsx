'use client';

import { memo } from 'react';
import React from 'react';

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    value: string;
    setValue: (v: string) => void;
    error: string | null;
    busyApprove: boolean;
    busyList: boolean;
    // NUEVO:
    title?: string;
    confirmLabel?: string;
};

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
}: Props) {
    if (!open) return null;

    const finalConfirm = confirmLabel ?? (busyApprove ? 'Approving…' : busyList ? 'Listing…' : 'Confirm');

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200/60 dark:border-gray-700/60">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>

                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Price (ETH)</label>
                <input
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.0100"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />

                {!!error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="mt-6 flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
                        disabled={busyApprove || busyList}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        disabled={busyApprove || busyList}
                    >
                        {finalConfirm}
                    </button>
                </div>
            </div>
        </div>
    );
});

export default ListForSaleModal;
