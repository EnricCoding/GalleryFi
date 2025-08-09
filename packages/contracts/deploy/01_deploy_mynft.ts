import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = ['GalleryFi', 'GAL', deployer, 500]; // 5%

  const { address } = await deploy('MyNFT', {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.live ? 3 : 1, 
    skipIfAlreadyDeployed: true, 
  });

  if (network.live && process.env.ETHERSCAN_API_KEY) {
    try {
      await run('verify:verify', { address, constructorArguments: args });
      log(`Verified MyNFT at ${address}`);
    } catch (e: any) {
      log(`Verify skipped: ${e.message}`);
    }
  }
};

export default func;
func.tags = ['MyNFT', 'all'];
