import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('MyNFT', {
    from: deployer,
    args: [
      'GalleryFi', // name
      'GAL', // symbol
      deployer, // royaltyReceiver
      500, // royaltyFeeBps (5%)
    ],
    log: true,
  });
};
export default func;
func.tags = ['MyNFT'];
