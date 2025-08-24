'use client';

import Link from 'next/link';
import WalletButton from '../shared/WalletButton';
import ProceedsWidget from '../shared/ProceedsWidget';

export default function Navbar() {
    return (
        <nav className="bg-white/70 backdrop-blur sticky top-0 z-50 border-b border-neutral-100 dark:bg-neutral-900/60 dark:border-neutral-800">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
                <Link href="/" className="text-2xl font-semibold">
                    GalleryFi
                </Link>

                <div className="flex items-center gap-3 sm:gap-6 text-base">
                    <Link href="/explore" className="hover:text-accent-dark transition-colors">
                        Explore
                    </Link>
                    <Link href="/create" className="hover:text-accent-dark transition-colors">
                        Create
                    </Link>
                    <ProceedsWidget variant="pill" />
                    <WalletButton />
                </div>
            </div>
        </nav>
    );
}
