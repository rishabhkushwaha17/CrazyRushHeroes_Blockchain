import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";
import { SensitiveString } from "hardhat/types/config";
import "@nomicfoundation/hardhat-ethers";

import * as dotenv from "dotenv";
dotenv.config();

const privateKey = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    base_sepolia: {
      type:"http",
      url: "https://base-sepolia.gateway.tenderly.co", // Base Sepolia RPC
      accounts: [privateKey],
      gasPrice: 10000000,
    },
    base_mainnet: {
      type:"http",
      url: "https://base.llamarpc.com", // Base Mainnet RPC
      accounts: [privateKey],
      // gasPrice: 30000000,
    },
  },
  verify:{
   etherscan: {
    apiKey: <SensitiveString>process.env.ETHERSCAN_API_KEY,
    enabled:true,
    },
  }
};

export default config;
