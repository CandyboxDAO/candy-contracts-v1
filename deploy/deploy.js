const { ethers } = require('hardhat');
const { BigNumber, constants, utils } = require('ethers');

/**
 * Deploys the Candy contracts.
 *
 * Example usage:
 *
 * npx hardhat deploy --network rinkeby
 *
 * TODO(odd-amphora): Conditionally use `skipIfAlreadyDeployed` iff mainnet.
 */
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer, caller } = await getNamedAccounts();

  let multisigAddress = deployer;
  // Prices Oracle
  // reffer https://docs.chain.link/docs/binance-smart-chain-addresses/
  // bsc-mainnet BNB/USD 0x0567f2323251f0aab15c8dfb1967e4e8a7d42aee
  // bsc-testnet BNB/USD 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526
  let priceOracle;

  console.log({ deployer, caller, k: await getChainId() });
  switch (await getChainId()) {
    // mainnet
    case '1':
      multisigAddress = deployer;//'0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e';
      break;
    // rinkeby
    case '4':
      multisigAddress = deployer;//'0x69C6026e3938adE9e1ddE8Ff6A37eC96595bF1e1';
      break;
    // hardhat / localhost
    case '31337':
      multisigAddress = deployer;
      break;
    // bsc mainnet
    case "56":
      // multisigAddress = '0x0CaE2f343Ee2B2BBcb03720BD720E4D2c5E4d9b4'
      priceOracle = '0x0567f2323251f0aab15c8dfb1967e4e8a7d42aee';
      break;
    // bsc testnet
    case "97":
      priceOracle = '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526';
      break;
    default:
      multisigAddress = deployer;
      break;
  }

  console.log({ multisigAddress });

  // Depoly all contracts
  const OperatorStore = await deploy('OperatorStore', {
    from: deployer,
    args: [],
    log: true,
  });

  const Projects = await deploy('Projects', {
    from: deployer,
    args: [OperatorStore.address],
    log: true,
  });

  const Prices = await deploy('Prices', {
    from: deployer,
    args: [],
    log: true,
  });

  const TerminalDirectory = await deploy('TerminalDirectory', {
    from: deployer,
    args: [Projects.address, OperatorStore.address],
    log: true,
  });

  const FundingCycles = await deploy('FundingCycles', {
    from: deployer,
    args: [TerminalDirectory.address],
    log: true,
  });

  const TicketBooth = await deploy('TicketBooth', {
    from: deployer,
    args: [Projects.address, OperatorStore.address,TerminalDirectory.address],
    log: true,
  });

  const ModStore = await deploy('ModStore', {
    from: deployer,
    args: [Projects.address, OperatorStore.address,TerminalDirectory.address],
    log: true,
  });  


  // The first project ID is used for governance.
  const Governance = await deploy('Governance', {
    from: deployer,
    args: [1, TerminalDirectory.address],
    log: true,
  });  

  const TerminalV1 = await deploy('TerminalV1', {
      from: deployer,
      args: [
        Projects.address,
        FundingCycles.address,
        TicketBooth.address,      
        OperatorStore.address,
        ModStore.address,
        Prices.address,
        TerminalDirectory.address,
        Governance.address                
      ],
      log: true,
    });

  const TerminalV1_1 = await deploy('TerminalV1_1', {
    from: deployer,
    args: [
      Projects.address,
      FundingCycles.address,
      TicketBooth.address,      
      OperatorStore.address,
      ModStore.address,
      Prices.address,
      TerminalDirectory.address,
      multisigAddress                
    ],
    log: true,
  });
  
  const ProxyPaymentAddressManager = await deploy('ProxyPaymentAddressManager', {
    from: deployer,
    args: [TerminalDirectory.address, TicketBooth.address],
    log: true,
  });

  // deploy FundingCycleBallots
  const Active3DaysFundingCycleBallot = await deploy('Active3DaysFundingCycleBallot', {
    from: deployer,
    args: [],
    log: true,
  });

  const Active7DaysFundingCycleBallot = await deploy('Active7DaysFundingCycleBallot', {
    from: deployer,
    args: [],
    log: true,
  });

  // set Prices Oracle
  const _prices = await ethers.getContract("Prices");
  await _prices.addFeed(priceOracle,1);

  /**
  // Set governance as the prices contract owner.  
  const _prices = await ethers.getContract("Prices");

  // await _prices.transferOwnership(Governance.address);

  const _projects = await ethers.getContract("Projects");
  const projectCount = await _projects.count();
  console.log('projectCount:'+ projectCount);

  if (projectCount < 1){

    //Deploy the governance contract's project. It will have an ID of 1.

     let [deployer2] = await ethers.getSigners();  
     
     const _v1 = await ethers.getContract("TerminalV1_1");  
     await _v1.connect(deployer2).deploy(
        deployer,
        utils.formatBytes32String('candybox'),
        'QmbzP8MTYdgycuwiB3ML2u7uD8yHNDfbV4LVcR3XMamyzA',
        {
          target: 0,
          currency: 0,
          // Duration must be zero so that the same cycle lasts throughout the tests.
          duration: 0,
          cycleLimit: BigNumber.from(0),
          discountRate: BigNumber.from(0),
          ballot: constants.AddressZero,
        },
        {
          reservedRate: 0,
          bondingCurveRate: 0,
          reconfigurationBondingCurveRate: 0,
          payIsPaused: false,
          ticketPrintingIsAllowed: false,
          treasuryExtension: constants.AddressZero
        },
        [],
        []
    );  
  }
   */
};