import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('NftMarketplace', {
    from: deployer,
    args: [
      deployer, // feeRecipient
      250, // platformFeeBps (2.5%)
    ],
    log: true,
  });
};
export default func;
func.tags = ['NftMarketplace'];
func.dependencies = ['MyNFT']; // opcional, si quieres que siempre MyNFT vaya antes
