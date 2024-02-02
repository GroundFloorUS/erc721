import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { input, select, confirm } from '@inquirer/prompts';
import { exit } from "process";
dotenvConfig();

// ----------------------------------------------------------------
// Command functions to be run
async function askForCommand(context) {
    if (context.connectedContractAddress) {
      console.log('Currently connected to contract at address: %s', context.connectedContractAddress);
    }
    const cmd = await select({
        message: 'What would you like to do?',
        choices: [
          {
            name: 'List Minted Tokens',
            value: 'showTokens',
            description: 'List all of the minted tokens and who their owners are',
          },
          {
            name: 'Show Wallet Balance',
            value: 'showBalance',
            description: 'Show balance of a given wallet',
          },
          {
            name: 'Connect To A Contract',
            value: 'confirmContractAddress',
            description: 'Deploy a new GroundfloorLroRedemptionToken contract',
          },
          {
            name: 'Deploy A New Contract',
            value: 'deployContract',
            description: 'Deploy a new GroundfloorLroRedemptionToken contract',
          },
          {
            name: 'Exit',
            value: 'exit'
          },
        ],
      });

    //----------------------------------------------------------------
    // Make sure we have a hash map to store response data and defaults
    ensureCommandContext(context, cmd);

    //----------------------------------------------------------------
    // Now execute the command to run
    console.log(`========================================================`);
    switch(cmd) {
      case 'deployContract': {
        await deployContract(context);
        break;
      }
      case 'confirmContractAddress': {
        await confirmContractAddress(context);
        break;
      }
      case 'showTokens': {
        await showTokens(context);
        break;
      }
      case 'showBalance': {
        await showBalance(context);
        break;
      }
      case 'exit': {
        console.log(`Bye Bye!`);
        return false;
      }
      default: {
        console.log(`Exiting, Command not implemented: ${cmd}`);
        return false;
      }
    }
    console.log(`========================================================`);
    console.log(``);
    return true;
}

//----------------------------------------------------------------
// Function to allocate hash space for command context including
// default values and responses.
async function ensureCommandContext(context, cmd) {
  if (!context[cmd]) { context[cmd] = {}; }
}

// ----------------------------------------------------------------
// Function that reset the results in the context to clear out data
// if we change contracts or need to refresh the data
async function resetResults(context) {
  // Listing Tokens
  await ensureCommandContext(context, 'showTokens')
  context.showTokens.totalMinted = null;
  context.showTokens.tokens = [];

  // Showing Balance
  await ensureCommandContext(context, 'showBalance')
  context.showBalance.walletAddress = null;
}


//----------------------------------------------------------------
// Function to iterate through the allocated tokens within a contract
async function showTokens(context) {
  if (!context.connectedContractAddress) { await confirmContractAddress(context); }

  if (context.showTokens.totalMinted) {
    const keep = await confirm({ 
      message: `Would you like to show the ${context.showTokens.totalMinted} tokens from the last execution?`,
      default: true 
    });
    if (!keep) {context.showTokens.totalMinted = null;}
  }

  if (!context.showTokens.totalMinted) {
    console.log(`Collecting minted token data...`);
    context.showTokens.totalMinted = await context.contract.totalMinted();
    context.showTokens.tokens = [];
    for (let i=0; i<context.showTokens.totalMinted; i++) {
      context.showTokens.tokens.push({
        wallet: await context.contract.ownerOf(i),
        uri: await context.contract.tokenURI(i),
      });
    }
  } else {
    console.log(`Showing cached minted token data...`);
  }

  if (context.showTokens.totalMinted < 1) {
    console.log(`This contract has no minted tokens to show.`);
  } else {
    for (let i=0; i<context.showTokens.tokens.length; i++) {
      let token = context.showTokens.tokens[i];
      console.log(`Token ${i}:`);
      console.log(`  Owned By: ${token.wallet}`);
      console.log(`  Metadata Uri: ${token.uri}`);
      console.log(`--------------------------------------------------------`);
    }
  }
}

// ----------------------------------------------------------------
// Function that connects to a specific contract and shows the 
// balance of a wallet
async function showBalance(context) {
  if (!context.connectedContractAddress) { await confirmContractAddress(context); }

  let walletAddress = null;
  while (!walletAddress) {
    walletAddress = await input({
      message: 'What wallet address should we show a balance for? (e.g hex value)',
      default: context.showBalance.walletAddress
    });
  }

  context.showBalance.walletAddress = walletAddress;
  const balance = await context.contract.balanceOf(walletAddress);
  console.log(` Wallet (${walletAddress} has a balance of: ${balance}`);
}

// ----------------------------------------------------------------
// Function to deploy a new Groundfloor Lro Redemption Token contract
// to the attacked network
async function deployContract(context) {
  context.deployContract.ownerAddress = await input({
    message: `What wallet should owner this contract?`,
    default: context.deployContract.ownerAddress ? context.deployContract.ownerAddress : context.signer.address 
  });

  context.deployContract.seriesId = await input({
    message: 'What is the lro series? (e.g. A,B,C,etc)',
    default: context.deployContract.seriesId ? context.deployContract.seriesId : 'A',
  });

  context.deployContract.totalSupply = parseInt(await input({
    message: `What is the total token supply for this contract? (e.g 50)`,
    default: context.deployContract.totalSupply,
  }));

  let seriesKey = context.deployContract.seriesId.padStart(context.maxSeriesDigits, '0'); 
  const keep = await confirm({ message: `Please confirm you want to deploy this contract to the ${process.env.HARDHAT_NETWORK} network`, default: false });
  if (!keep) {
    console.log(`Breaking, user cancelled contract deployment.`);
    return;
  }

  //----------------------------------------------------------------
  // Contract input validation
  if (!context.deployContract.ownerAddress) {
    console.log(`Unable to deploy without a valid owners wallet address: ${context.deployContract.ownerAddress}`);
    return;
  }

  if (!context.deployContract.seriesId) {
    console.log(`Unable to deploy without a valid series Id: ${context.deployContract.seriesId}`);
    return;
  }

  if (!context.deployContract.totalSupply || context.deployContract.totalSupply < 1) {
    console.log(`Unable to deploy without a total supply: ${context.deployContract.totalSupply}`);
    return;
  }

  //----------------------------------------------------------------
  // Deploy Contract
  console.log(`--------------------------------------------------------`);
  console.log(`Deploying New GroundfloorLroRedemption Contract:`);
  console.log(`  Owned By: ${context.deployContract.ownerAddress}`);
  console.log(`  Series Id: ${seriesKey}`);
  console.log(`  Token Supply: ${context.deployContract.totalSupply}`);

  const newContract = await context.contractFactory.deploy(
    context.deployContract.ownerAddress,
    seriesKey,
    context.deployContract.totalSupply
  );
  const newContractAddress = await newContract.getAddress();

  console.log(`  ------------------------------------------------------`);
  console.log(`  New Contract Address: ${newContractAddress}`);
  console.log(`--------------------------------------------------------`);

  if (await confirm({ message: `Would you like to connect to the new contract?`, default: true })) {
    context.contract = newContract;
    context.contractAddress = newContractAddress;
    await connectToContract(context)
  }
}

// ----------------------------------------------------------------
// Function that confirms from the user we are working with the 
// correct contract
async function confirmContractAddress(context) {
  context.contractAddress = await input({ 
    message: 'What is the address of the contract we should connect to? (e.g hex value)', 
    default: context.contractAddress 
  });

  if (context.connectedContractAddress !== context.contractAddress) {
    await connectToContract(context);
  }
}

// ----------------------------------------------------------------
// Function that connects to the contract by it's wallet address
async function connectToContract(context) {
  context.contract = await context.contractFactory.attach(context.contractAddress);
  console.log(`Attached to contract at address: ${context.contractAddress}`);

  await context.contract.connect(context.signer);
  console.log(`Connected to contract from address: ${context.signer.address}`);
  context.connectedContractAddress = context.contractAddress;
  resetResults(context);
}


// ----------------------------------------------------------------
// Main Script Function
async function main() {
    // ----------------------------------------------------------------
    // Context varible to store state for the script and to pass between functions
    let context = {};
    // ----------------------------------------------------------------

    // ----------------------------------------------------------------
    // Script constants
    context.contractFactory = await ethers.getContractFactory("GroundfloorLroRedemptionToken");
    context.defaultUriBase = 'https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/bafybeifcfnt5qsdw3hezgie3dovf6wkcs73reuwqvvjffocfvvb2igcdwy';
    [context.signer] = await ethers.getSigners();

    // ----------------------------------------------------------------
    // Load env defaults
    context.maxSeriesDigits = 4;
    context.maxTokenDigits = 5;
    switch(process.env.HARDHAT_NETWORK.toLocaleLowerCase()) { 
        case 'localhost': { 
          context.contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
          break; 
        } 
        case 'sepolia': { 
          context.contractAddress = "0x0c3569e963Cbdf810F9481587a709a8A82f8dE0A";
            break; 
        } 
        default: { 
            console.log(`Exiting, Invalid environment: ${process.env.HARDHAT_NETWORK}`);
            return;
        } 
    }  
    console.log("Loaded environment defaults for: %s", process.env.HARDHAT_NETWORK);

    // ----------------------------------------------------------------
    // Command loops
    let interact = true
    while (interact) {
        interact = await askForCommand(context);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
