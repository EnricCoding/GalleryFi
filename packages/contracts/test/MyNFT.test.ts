// packages/contracts/test/MyNFT.test.ts

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, Fixture } from './helpers';

describe('MyNFT', () => {
  // Interface IDs per EIP‑165/EIP‑2981
  const ERC165_ID = '0x01ffc9a7';
  const ERC721_ID = '0x80ac58cd';
  const ERC2981_ID = '0x2a55205a';

  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await loadFixture();
  });

  it('deploys with correct name, symbol and default royalty', async () => {
    const { nft, deployer } = fixture;
    const ownerAddr = await deployer.getAddress();

    expect(await nft.name()).to.equal('GalleryFi');
    expect(await nft.symbol()).to.equal('GAL');

    // Default royalty is 5% = 500 bps
    const salePrice = ethers.parseEther('1'); // bigint
    const [receiver, amount] = await nft.royaltyInfo(1, salePrice);
    expect(receiver).to.equal(ownerAddr);
    expect(amount).to.equal((salePrice * 500n) / 10000n);
  });

  it('allows only owner to mint and assigns tokenURI correctly', async () => {
    const { nft, deployer, alice } = fixture;
    const aliceAddr = await alice.getAddress();

    // Non-owner cannot mint → OZ5 custom error
    await expect(nft.connect(alice).mint(aliceAddr, 'cid1'))
      .to.be.revertedWithCustomError(nft, 'OwnableUnauthorizedAccount')
      .withArgs(aliceAddr);

    // Owner mints token #1
    await expect(nft.connect(deployer).mint(aliceAddr, 'cid1'))
      .to.emit(nft, 'Transfer')
      .withArgs(ethers.ZeroAddress, aliceAddr, 1n);

    expect(await nft.ownerOf(1)).to.equal(aliceAddr);
    expect(await nft.tokenURI(1)).to.equal('cid1');

    // Minting again yields #2
    await nft.connect(deployer).mint(aliceAddr, 'cid2');
    expect(await nft.ownerOf(2)).to.equal(aliceAddr);
    expect(await nft.tokenURI(2)).to.equal('cid2');
  });

  it('updates and deletes default royalty', async () => {
    const { nft, deployer, alice } = fixture;
    const aliceAddr = await alice.getAddress();
    const salePrice = ethers.parseEther('2');

    // Change default royalty to Alice @1% (100 bps)
    await nft.connect(deployer).setDefaultRoyalty(aliceAddr, 100);
    const [recv1, amt1] = await nft.royaltyInfo(1, salePrice);
    expect(recv1).to.equal(aliceAddr);
    expect(amt1).to.equal((salePrice * 100n) / 10000n);

    // Delete default royalty
    await nft.connect(deployer).deleteDefaultRoyalty();
    const [recv2, amt2] = await nft.royaltyInfo(1, salePrice);
    expect(recv2).to.equal(ethers.ZeroAddress);
    expect(amt2).to.equal(0n);
  });

  it('sets baseTokenURI and concatenates correctly', async () => {
    const { nft, deployer, bob } = fixture;
    const bobAddr = await bob.getAddress();

    // Set base and mint
    await nft.connect(deployer).setBaseTokenURI('ipfs://base/');
    await nft.connect(deployer).mint(bobAddr, 'metadata1.json');

    expect(await nft.tokenURI(1)).to.equal('ipfs://base/metadata1.json');
  });

  it('supports ERC165, ERC721 and ERC2981 interfaces', async () => {
    const { nft } = fixture;

    expect(await nft.supportsInterface(ERC165_ID)).to.be.true;
    expect(await nft.supportsInterface(ERC721_ID)).to.be.true;
    expect(await nft.supportsInterface(ERC2981_ID)).to.be.true;
    expect(await nft.supportsInterface('0xabcdef01')).to.be.false;
  });
});
