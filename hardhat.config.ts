import "@nomicfoundation/hardhat-toolbox";
//import "@nomiclabs/hardhat-etherscan"
import { HardhatUserConfig } from "hardhat/config";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    goerli: {
      accounts: [`${process.env.TEST_PRIVATE_KEY}`],
      url: `${process.env.TEST_NETWORK_URL}`
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  gasReporter: {
    coinmarketcap: "af72c939-942c-4097-b338-e3175fa676c6",
    enabled: true,
    currency: "USD"
  }
};

export default config;