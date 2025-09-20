'use client';

import MintListForm from "./components/MintListForm";

const NFT = process.env.NEXT_PUBLIC_NFT_ADDRESS as `0x${string}`;
const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}`;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);

export default function CreatePage() {
    return (
        <main className="min-h-screen bg-primary-light dark:bg-neutral-900">
            <div className="w-full max-w-none mx-auto p-6 space-y-6">
                <MintListForm
                    nftAddress={NFT}
                    marketAddress={MARKET}
                    expectedChainId={CHAIN_ID}
                />
            </div>
        </main>
    );
}
