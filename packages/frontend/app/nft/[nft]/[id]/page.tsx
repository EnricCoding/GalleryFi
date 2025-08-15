
import NftDetail from "../components/NftDetail";

export default function NftPage({
    params,
}: {
    params: { nft: string; id: string };
}) {
    return (
        <NftDetail
            nft={params.nft as `0x${string}`}
            tokenId={params.id}
        />
    );
}
