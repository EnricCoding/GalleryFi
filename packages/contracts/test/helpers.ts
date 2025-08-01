// packages/contracts/test/helpers.ts
import { ethers, deployments } from 'hardhat';
import type { Signer } from 'ethers';
import type { MyNFT, NftMarketplace } from '../typechain';

export interface Fixture {
  /* signers */
  owner: Signer; // = deployer
  deployer: Signer; // alias, por claridad
  alice: Signer;
  bob: Signer;

  /* contracts */
  nft: MyNFT;
  market: NftMarketplace;
}

export async function loadFixture(): Promise<Fixture> {
  // 1. Obtener signers
  const [deployer, alice, bob] = await ethers.getSigners();
  const owner = deployer; // alias

  // 2. Ejecutar todos los scripts de hardhat‑deploy
  await deployments.fixture();

  // 3. Recoger direcciones de los despliegues
  const nftDeployment = await deployments.get('MyNFT');
  const mktDeployment = await deployments.get('NftMarketplace');

  // 4. Conectar instancias a `deployer`
  const nft = (await ethers.getContractAt('MyNFT', nftDeployment.address, deployer)) as MyNFT;

  const market = (await ethers.getContractAt(
    'NftMarketplace',
    mktDeployment.address,
    deployer,
  )) as NftMarketplace;

  return { owner, deployer, alice, bob, nft, market };
}
