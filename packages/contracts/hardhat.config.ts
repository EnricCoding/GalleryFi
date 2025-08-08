import { HardhatUserConfig } from 'hardhat/config';

import '@nomicfoundation/hardhat-toolbox';

import 'hardhat-deploy'; 
import 'solidity-coverage';
import '@nomiclabs/hardhat-solhint'; 
import * as dotenv from "dotenv";

dotenv.config();


const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28', 
    settings: { optimizer: { enabled: true, runs: 200 } },
  },

  defaultNetwork: 'hardhat',

  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    arbitrumSepolia: {
      url: process.env.ARB_SEPOLIA_RPC || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614,
    },
  },

  namedAccounts: {
    deployer: { default: 0 },
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    token: 'ETH',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || '',
  },

  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || '',
    },
  },

  typechain: { outDir: 'typechain', target: 'ethers-v6' },
};

export default config;
