'use client';

import { useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type, show, onClose, duration = 5000 }: ToastProps) {
    useEffect(() => {
        if (show && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    const getToastStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300';
            case 'info':
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return 'bg-emerald-500';
            case 'error':
                return 'bg-red-500';
            case 'info':
            default:
                return 'bg-blue-500';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case 'info':
            default:
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    return (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 transform ${
            show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } ${getToastStyles()}`}>
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getIconColor()}`} />
                <div className="flex items-center gap-2">
                    {getIcon()}
                    <span className="font-medium">{message}</span>
                </div>
                <button
                    onClick={onClose}
                    className="ml-2 hover:opacity-70 transition-opacity"
                    aria-label="Cerrar notificación"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
