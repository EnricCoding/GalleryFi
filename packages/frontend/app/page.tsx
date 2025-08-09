import Link from 'next/link';
import WalletButton from '@/components/shared/WalletButton';

export default function Home() {
  return (
    <main className="bg-primary-light dark:bg-neutral-900 min-h-screen flex flex-col">
      <header className="max-w-4xl w-full mx-auto flex justify-between items-center py-6 px-4">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          GalleryFi
        </h1>
        <WalletButton />
      </header>

      <section className="max-w-4xl w-full mx-auto p-6 space-y-4">
        <p className="text-base text-neutral-600 dark:text-neutral-300">
          A sleek NFT marketplace on Sepolia, featuring on-chain auctions and
          EIP-2981 royalties.
        </p>
        <Link
          href="/explore"
          className="inline-block bg-accent text-white font-semibold px-5 py-3 rounded hover:bg-accent-dark transition"
        >
          Explore Listings →
        </Link>
      </section>
    </main>
  );
}
