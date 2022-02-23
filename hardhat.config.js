const fs = require('fs');
const dotenv = require('dotenv');
const taskNames = require('hardhat/builtin-tasks/task-names');

require("@nomiclabs/hardhat-ganache");
require('@nomiclabs/hardhat-etherscan');
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-ethers');
require('hardhat-gas-reporter');
require('hardhat-deploy');
require('hardhat-deploy-ethers');
require('solidity-coverage');

dotenv.config();

const defaultNetwork = 'localhost';

function mnemonic() {
  try {
    return fs.readFileSync('./mnemonic.txt').toString().trim();
  } catch (e) {
    if (defaultNetwork !== 'localhost') {
      console.log('☢️ WARNING: No mnemonic file created for a deploy account.');
    }
  }
  return '';
}

function privatekeys(network){
  network = network || defaultNetwork;
  let accounts = [process.env.LOCAL_DEPLOYER_PRIVATE_KEY, process.env.LOCAL_CALLER_PRIVATE_KEY];
  switch(network) {
      case "bsc":
      case "avalanche":
      case "aurora":
      case "mainnet":
        accounts = [process.env.DEPLOYER_PRIVATE_KEY, process.env.CALLER_PRIVATE_KEY];
        break;
      case "bscTestnet":
      case "avalancheFujiTestnet":
      case "auroraTestnet":
      case "rinkeby":
        accounts = [process.env.TEST_DEPLOYER_PRIVATE_KEY, process.env.TEST_CALLER_PRIVATE_KEY];
        break;
      default:
        break;
  }
  return accounts;
}

const infuraId = process.env.INFURA_ID;

module.exports = {
  defaultNetwork,
  networks: {
    localhost: {
      url: 'http://localhost:8545',
      blockGasLimit: 10000000,
      gas: 10000000,
      network_id: '*', // eslint-disable-line camelcase
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/' + infuraId,
      gasPrice: 50000000000,
      accounts: {
        mnemonic: mnemonic(),
      },
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/' + infuraId,
      gasPrice: 160000000000,
      accounts: {
        mnemonic: mnemonic(),
      },
    },
    // near-aurora network
    auroraTestnet: {
      url: 'https://testnet.aurora.dev',      
      accounts: privatekeys("auroraTestnet")
    },
    // bsc network
    bsc: {
      url: 'https://bsc-dataseed1.binance.org',
      accounts: privatekeys("bsc"),
      gasPrice: 5000000000,
      network_id: 56
    },
    bscTestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: privatekeys("bscTestnet"),
      network_id: 97,
      gas: 10000000
    },
    // avalanche network
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts: privatekeys("avalanche"),
      network_id: 43114
    },
    avalancheFujiTestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: privatekeys("avalancheFujiTestnet"),
      network_id: 43113,
    }
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    caller: {
      default: 1,
    },
    feeCollector: {
      default: 2,
    },
  },
  solidity: {
    version: '0.8.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  mocha: {
    bail: true,
    timeout: 6000,
  },
  gasReporter: {
    currency: 'USD',
    // gasPrice: 21,
    enabled: !!process.env.REPORT_GAS,
    showTimeSpent: true,
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      ropsten: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,      
      // binance smart chain
      bsc: process.env.BSCSCAN_API_KEY,
      bscTestnet:  process.env.BSCSCAN_API_KEY,   
      // avalanche
      avalanche: process.env.SNOWTRACE_API_KEY,
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,    
      // fantom mainnet
      opera: "YOUR_FTMSCAN_API_KEY",
      ftmTestnet: "YOUR_FTMSCAN_API_KEY",    
      // polygon
      polygon: "YOUR_POLYGONSCAN_API_KEY",
      polygonMumbai: "YOUR_POLYGONSCAN_API_KEY"     
    },

    verify_axiosDefaultConfig: {
      proxy: true,
      httpsAgentUrl: "http://127.0.0.1:19180"
    }
  },
};

// List details of deployer account.
task('account', 'Get balance informations for the deployment account.', async (_, { ethers }) => {
  const hdkey = require('ethereumjs-wallet/hdkey');
  const bip39 = require('bip39');
  let mnemonic = fs.readFileSync('./mnemonic.txt').toString().trim();
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const hdwallet = hdkey.fromMasterSeed(seed);
  const wallet_hdpath = "m/44'/60'/0'/0/";
  const account_index = 0;
  let fullPath = wallet_hdpath + account_index;
  const wallet = hdwallet.derivePath(fullPath).getWallet();
  var EthUtil = require('ethereumjs-util');
  const address = '0x' + EthUtil.privateToAddress(wallet._privKey).toString('hex');

  console.log('Deployer Account: ' + address);
  for (let n in config.networks) {
    try {
      let provider = new ethers.providers.JsonRpcProvider(config.networks[n].url);
      let balance = await provider.getBalance(address);
      console.log(' -- ' + n + ' --  -- -- 📡 ');
      console.log('   balance: ' + ethers.utils.formatEther(balance));
      console.log('   nonce: ' + (await provider.getTransactionCount(address)));
    } catch (e) {
      console.log(e);
    }
  }
});

task('compile:one', 'Compiles a single contract in isolation')
  .addPositionalParam('contractName')
  .setAction(async function (args, env) {
    const sourceName = env.artifacts.readArtifactSync(args.contractName).sourceName;

    const dependencyGraph = await env.run(taskNames.TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH, {
      sourceNames: [sourceName],
    });

    const resolvedFiles = dependencyGraph.getResolvedFiles().filter((resolvedFile) => {
      return resolvedFile.sourceName === sourceName;
    });

    const compilationJob = await env.run(
      taskNames.TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE,
      {
        dependencyGraph,
        file: resolvedFiles[0],
      },
    );

    await env.run(taskNames.TASK_COMPILE_SOLIDITY_COMPILE_JOB, {
      compilationJob,
      compilationJobs: [compilationJob],
      compilationJobIndex: 0,
      emitsArtifacts: true,
      quiet: true,
    });
  });
