import { expect } from 'chai';
import { ethers, EventLog } from 'ethers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { loadFixture, Fixture } from './helpers';

function emittedTokenId(
  receipt: ethers.ContractTransactionReceipt | null,
): bigint {
  if (!receipt) throw new Error('no tx receipt');

  // localiza el primer Transfer
  const log = receipt.logs.find((l): l is EventLog => (l as EventLog).eventName === 'Transfer');
  if (!log) throw new Error('Transfer event not found');

  return log.args![2] as bigint; // tokenId
}

describe('NftMarketplace', () => {
  let f: Fixture;
  beforeEach(async () => (f = await loadFixture()));

  it('allows listing and fixed-price purchase with correct proceeds split', async () => {
    const { nft, market, deployer, alice, bob } = f;

    /************ 0. Parámetros ************/
    const price = 1_000n;
    const aliceAddr = await alice.getAddress();

    /************ 1. Mint + approve ************/
    const mintRc = await (await nft.connect(deployer).mint(aliceAddr, 'cid')).wait();
    const tokenId = emittedTokenId(mintRc);
    await nft.connect(alice).approve(await market.getAddress(), tokenId);
    console.log('🔹 tokenId =', tokenId.toString());

    /************ 2. List & buy ************/
    await market.connect(alice).listItem(await nft.getAddress(), tokenId, price);
    await market.connect(bob).buyItem(await nft.getAddress(), tokenId, { value: price });

    /************ 3. Splits esperados ************/
    const [royRecv, royalty] = await nft.royaltyInfo(tokenId, price); 
    const feeBps = await market.platformFeeBps(); 
    const fee = (price * BigInt(feeBps)) / 10_000n; 
    const sellerNet = price - fee - royalty;
    const feeRecipient = await market.feeRecipient();

    console.log(
      `🔹 royaltyRecv=${royRecv}  feeRecipient=${feeRecipient}\n` +
        `   royalty=${royalty}  fee=${fee}  sellerNet=${sellerNet}`,
    );

    expect(await nft.ownerOf(tokenId)).to.equal(await bob.getAddress()); 
    expect(await market.proceeds(aliceAddr)).to.equal(sellerNet);

    if (royRecv === feeRecipient) {
      const combined = royalty + fee;
      expect(await market.proceeds(royRecv)).to.equal(combined);
      console.log('🔹 Misma dirección: recibe royalty + fee =', combined.toString());
    } else {
      expect(await market.proceeds(royRecv)).to.equal(royalty);
      expect(await market.proceeds(feeRecipient)).to.equal(fee);
      console.log('🔹 Distintas direcciones – royalty y fee separados');
    }

    await expect(() => market.connect(alice).withdrawProceeds()).to.changeEtherBalance(
      alice,
      sellerNet,
    );
    console.log('🔹 Alice ha retirado', sellerNet.toString(), 'wei');
  });

  it('allows delisting and returns NFT to seller', async () => {
    const { nft, market, deployer, alice } = f;

    const id = emittedTokenId(
      await (await nft.connect(deployer).mint(await alice.getAddress(), 'cid2')).wait(),
    );
    await nft.connect(alice).approve(await market.getAddress(), id);
    await market.connect(alice).listItem(await nft.getAddress(), id, 500n);

    await expect(market.connect(alice).delistItem(await nft.getAddress(), id))
      .to.emit(market, 'ItemDelisted')
      .withArgs(await nft.getAddress(), id);

    expect(await nft.ownerOf(id)).to.equal(await alice.getAddress());
  });

  it('handles auctions end-to-end', async () => {
    const { nft, market, deployer, alice, bob } = f;

    const id = emittedTokenId(
      await (await nft.connect(deployer).mint(await alice.getAddress(), 'cid3')).wait(),
    );
    await nft.connect(alice).approve(await market.getAddress(), id);

    const oneHour = 3600;
    await market.connect(alice).createAuction(await nft.getAddress(), id, oneHour);
    await market.connect(bob).bid(await nft.getAddress(), id, { value: 2_000n });

    await time.increase(oneHour + 1);
    await expect(market.endAuction(await nft.getAddress(), id))
      .to.emit(market, 'AuctionEnded')
      .withArgs(await nft.getAddress(), id, await bob.getAddress(), 2_000n);

    expect(await nft.ownerOf(id)).to.equal(await bob.getAddress());
  });

  it('pauses and unpauses critical functions', async () => {
    const { nft, market, deployer, alice } = f;

    const id = emittedTokenId(
      await (await nft.connect(deployer).mint(await alice.getAddress(), 'cid4')).wait(),
    );
    await nft.connect(alice).approve(await market.getAddress(), id);

    await market.connect(deployer).pause();
    await expect(
      market.connect(alice).listItem(await nft.getAddress(), id, 100n),
    ).to.be.revertedWithCustomError(market, 'EnforcedPause');

    await market.connect(deployer).unpause();
    await market.connect(alice).listItem(await nft.getAddress(), id, 100n);

    const listing = await market.listings(await nft.getAddress(), id);
    expect(listing.price).to.equal(100n);
  });
});
