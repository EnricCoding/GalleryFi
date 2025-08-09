'use client';

import { Listing } from '@/lib/types/listing';
import ListingCard from './ListingCard';

export default function ListingsGrid({ listings }: { listings: Listing[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
            ))}
        </div>
    );
}
