'use client';

import Image from 'next/image';
import { useMemo, useEffect } from 'react';

type Props = {
    file: File | null;
    setFile: (f: File | null) => void;
    maxMb: number;
};

export default function UploadCard({ file, setFile, maxMb }: Props) {
    const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    return (
        <div className="space-y-4">
            <label htmlFor="file" className="block text-sm font-medium">
                Image <span className="text-red-500">*</span>
            </label>

            <div className="relative group">
                <input
                    id="file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 
                     p-6 text-center transition-all duration-200
                     group-hover:border-accent group-hover:shadow-sm
                     focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"
                >
                    <div className="flex flex-col items-center gap-2">
                        <div
                            className="w-12 h-12 rounded-full border border-dashed flex items-center justify-center
                         text-neutral-400 dark:text-neutral-500 group-hover:text-accent"
                        >
                            <span className="text-2xl">＋</span>
                        </div>
                        <div className="text-sm">
                            <span className="font-medium text-accent hover:text-accent-dark cursor-pointer">Click to upload</span>
                            <span className="text-neutral-600 dark:text-neutral-400"> or drag and drop</span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            PNG, JPEG, WEBP, GIF up to {maxMb}MB
                        </p>
                        {file && <p className="text-xs font-medium text-accent">Selected: {file.name}</p>}
                    </div>
                </div>
            </div>

            {previewUrl && (
                <div className="rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                    <Image
                        src={previewUrl}
                        alt="preview"
                        width={800}
                        height={800}
                        unoptimized
                        className="w-full h-64 object-cover"
                    />
                </div>
            )}
        </div>
    );
}
