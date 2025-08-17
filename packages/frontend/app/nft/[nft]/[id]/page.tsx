
import NftDetail from "../components/NftDetail";

export default async function NftPage({
    params,
}: {
    params: Promise<{ nft: string; id: string }>;
}) {
    const { nft, id } = await params;
    
    return (
        <NftDetail
            nft={nft as `0x${string}`}
            tokenId={id}
        />
    );
}
