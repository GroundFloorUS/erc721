import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { input, select, confirm } from '@inquirer/prompts';
import { copyFile, readFile, writeFile, mkdir } from 'fs/promises';
import { exit } from "process";
import { Token } from "./data/token.ts";
import Handlebars from 'handlebars';
import Jimp from "jimp";
import pinataSDK from '@pinata/sdk';

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
            name: 'Mint Tokens',
            value: 'mintTokens',
            description: 'Mint new tokens to an exisiting contract',
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
      case 'showTokens': {
        await showTokens(context);
        break;
      }
      case 'showBalance': {
        await showBalance(context);
        break;
      }
      case 'confirmContractAddress': {
        await confirmContractAddress(context);
        break;
      }
      case 'mintTokens': {
        await mintTokens(context);
        break;
      }
      case 'deployContract': {
        await deployContract(context);
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
async function ensureCommandContext(context, cmd, forceReset = false) {
  if (!context[cmd] || forceReset) { context[cmd] = {}; }
}

// ----------------------------------------------------------------
// Function that reset the results in the context to clear out data
// if we change contracts or need to refresh the data
async function resetResults(context) {
  // Listing Tokens
  await ensureCommandContext(context, 'showTokens', true)

  // Showing Balance
  await ensureCommandContext(context, 'showBalance', true)

  // Minting Tokens
  await ensureCommandContext(context, 'mintTokens', true)
  await ensureCommandContext(context, 'tokenData', true)
}

//----------------------------------------------------------------
// Function to dry up prompts when I want to store contextual data
async function ask(context, key, question, defaultValue) {
  if (!context[key]) { context[key] = defaultValue; }
  context[key] = await input({ message: question, default: context[key] });
}

async function askInt(context, key, question, defaultValue) {
  if (!context[key]) { context[key] = defaultValue; }
  context[key] = parseInt(await input({ message: question, default: context[key] }));
}

//----------------------------------------------------------------
// Function to mint new tokens to an existing contract
async function mintTokens(context) {
  if (!context.connectedContractAddress) { await confirmContractAddress(context); }

  //----------------------------------------------------------------
  // Pick up contract defaults
  let token = new Token(context.mintTokens.tokenData);

  token.data.seriesKey = await context.contract.seriesKey();
  token.data.symbol = await context.contract.symbol();

  /////////////////// Ask the questions about the drop
  await ask(token.data, 'series', 'What is the external url for this series?', 'https://crypto.groundfloor.com/nft');
  await ask(token.data, 'name', 'What is the name of the property?', '1703 Bryden Rd');
  await ask(token.data, 'address1', 'What is the address 1 of the property?', token.data.name);
  await ask(token.data, 'address2', 'What is the address 2 of the property?', 'Columbus OH, 43205');
  await askInt(token.data, 'loanAmount', 'What is the loan amount for this token? (e.g. 40000.00)', 40000.00);
  await ask(token.data, 'purpose', 'What is the purpose of this loan?', 'Rehab of House');
  await ask(token.data, 'securityPosition', 'What is the security position of this loan? (e.g. First Lien)', 'First Lien');
  await ask(token.data, 'amount', 'What is the investment amount for this token? (e.g. 1000.00)', 1000.00);
  await ask(token.data, 'rate', 'What is the lro rate? (e.g. 5.0)', 12.0);
  await askInt(token.data, 'term', 'What is the lro term? (e.g. 12)', 15);
  await ask(token.data, 'ltarv', 'What is the LT Arv? (e.g. 72.3)', 68.6);
  await askInt(token.data, 'loanId', 'What is the lro id? (ActiveAdmin Id)', 13994);
  await ask(token.data, 'assetUrl', 'What is the asset url for this property? (e.g. AA preview page)', 'https://www.groundfloor.us/investments/la_c0bf5ef67548/preview');
  await ask(token.data, 'investmentDate', 'What is the investment date? (YYYY-MM-DD)', '2023-10-09');
  await ask(token.data, 'maturityDate', 'What is the maturity date? (YYYY-MM-DD)', '2024-05-22');
  await askInt(token.data, 'tokenCount', 'How many tokens to be generated?', 2);
  await ask(token.data, 'offeringCircular', 'What is the url for the offering circular?', 'https://www.sec.gov/Archives/edgar/data/1588504/000114420418000003/tv482169_partiiandiii.htm');
  await ask(token.data, 'tokenRegistrationUrl', 'What is the url for investors to register their tokens?', 'https://crypto.groundfloor.com/nft');
  token.data.sendToIPFS = await confirm({ 
    message: `Do you want to push these to Pinata (ipfs)?`, 
    default: false 
  });

  token.computeValues();
  context.mintTokens.tokenData = token.data;

  // ----------------------------------------------------------------
  // Make sure our local directions are there
  await mkdir(token.data.imagePath, { recursive: true });
  await mkdir(token.data.metadataPath, { recursive: true });

  // ----------------------------------------------------------------
  // Create the token images and write the correct data on them
  for (let tokenId = 0; tokenId < token.data.tokenCount; tokenId++) {
    let dna = token.dna(tokenId.toString().padStart(context.maxTokenDigits, '0'));

    // Create image
    let imgPath = `${token.data.imagePath}/${dna}.jpeg` ;
    await copyFile(token.data.lroTemplatePath, imgPath);
    await createNftImage(imgPath, dna, token.data);
  }

  // ----------------------------------------------------------------
  // Send the files to ipfs for storage
  if (token.data.sendToIPFS) {
    let pinataRes = await sendToPinata(
      context,
      token.data.imagePath,
      { seriesID: token.data.seriesID }
    );
    token.data.folderCID = pinataRes.IpfsHash
    console.log(`Token images created and pushed to IPFS: ${token.data.folderCID}`);
  } else {
    console.log(`Token metadata created locally`);
  }

  // ----------------------------------------------------------------
  // Now create the metadata for the tokens
  const template_source = await content(`${token.data.rootPath}/metadata-values.json.mustache`);
  const template = Handlebars.compile(template_source);

  let mintedTokens = [];
  for (let tokenId = 0; tokenId < token.data.tokenCount; tokenId++) {
    let dna = token.dna(tokenId.toString().padStart(context.maxTokenDigits, '0'));
    let tokenName = `Groundfloor LRO Redemption Token (GLRT) - ${token.data.seriesID}`
    let uuid = crypto.randomUUID();

    // Create json file
    let filePath = `${token.data.metadataPath}/${dna}.json`;
    let json = template({
      dna,
      series: token.data.series,
      externalUrl: token.data.externalUrl,
      tokenName,
      address: token.data.address,
      amountUSD: token.data.amountUSD,
      returnUSD: token.data.returnUSD,
      loanAmountUSD: token.data.loanAmountUSD,
      purpose: token.data.purpose,
      securityPosition: token.data.securityPosition,
      amount: token.data.amount,
      rate: token.data.rate,
      term: token.data.term,
      ltarv: token.data.ltarv,
      loanId: token.data.loanId,
      assetUrl: token.data.assetUrl,
      investmentDate: token.data.investmentDate,
      maturityDate: token.data.maturityDate,
      tokenCount: token.data.tokenCount,
      offeringCircular: token.data.offeringCircular,
      tokenRegistrationUrl: token.data.tokenRegistrationUrl,
      tokenName,
      tokenId,
      uuid,
      "imageUrl": `${process.env.IPFS_GATEWAY}/ipfs/${token.data.folderCID}/${dna}.jpeg`,
    })
    await writeFile(filePath, json);
    mintedTokens.push(uuid);
  }

  if (token.data.sendToIPFS) {
    let pinataRes = await sendToPinata(
      context,
      token.data.metadataPath, 
      { seriesID: token.data.seriesID }
    );
    token.data.ipfsHash = pinataRes.IpfsHash;
    console.log(`Tokens and metadata created and pushed to IPFS: ${token.data.ipfsHash}`);
  } else {
    console.log(`Tokens and metadata created locally`);
  }

  const ack = await confirm({ message: `Please confirm you want to mint this tokens on the ${process.env.HARDHAT_NETWORK} network`, default: false });
  if (!ack) {
    console.log(`Breaking, user cancelled mint.`);
    return;
  }

  // ----------------------------------------------------------------
  // Mint Tokens onChain
  let walletAddress = null;
  while (!walletAddress) {
    walletAddress = await input({
      message: 'What wallet address should own these tokens? (e.g hex value)',
      default: context.mintTokens.tokenOwnerAddress,
    });
  }

  context.mintTokens.tokenOwnerAddress = walletAddress;
  console.log(`Minting ${mintedTokens.length} tokens to wallet: ${walletAddress}`);
  for (let tokenId = 0; tokenId < token.data.tokenCount; tokenId++) {
    let dna = token.dna(tokenId.toString().padStart(context.maxTokenDigits, '0'));
    let tokenURI = `${process.env.IPFS_GATEWAY}/ipfs/${token.data.ipfsHash}/${dna}.json`;
    console.log(`----------------------------------------------------`);
    console.log(`  Minting Token: ${tokenId} of ${mintedTokens.length}`);
    console.log(`    Token URI: ${tokenURI}`);
    console.log(`    Token UUID: ${mintedTokens[tokenId]}`);
    const mintTx = await context.contract.safeMint(walletAddress, tokenURI);
    console.log(`    Minted token: ${mintTx.hash}\n`);
  }
  console.log(`----------------------------------------------------`);
  console.log(`${token.data.tokenCount} tokens created. View them here: ${token.data.seriesPath}`);
}

// ----------------------------------------------------------------
// Helper function to process the image and add the text to it
// and then store it out to a file
async function createNftImage(imgPath, dna, data) {
  console.log("Creating Token Image: ", imgPath);
  const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const font16 = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  const image = await Jimp.read(imgPath);
  const totalH = image.bitmap.height; 
  
  let startX = 20;
  let startY = (totalH - 265);
  let ts = 20; // text spacing
  let bs = 30; // box spacing

  // Details Box
  image.print(font32, (startX + 2), startY, data.name);

  // Reset Y Postion for Details
  startX += 5;
  startY += bs;

  image.print(font16, startX, startY += ts, `Amount: ${data.amountUSD}`);
  image.print(font16, startX, startY += ts, `Effective Annual Return: ${data.returnUSD}`);
  image.print(font16, startX, startY += ts, `Purpose: ${data.purpose}`);
  image.print(font16, startX, startY += ts, `Matures: ${data.maturityDate}`);
  image.print(font16, startX, startY += ts, `Interest Rate: ${data.rate}%`);
  // Reset Y Postion for Address and DNA boxes
  startY += bs + 10;

  // Address Box
  image.print(font16, startX, startY, 'Address:');
  image.print(font16, startX, startY + (ts * 1), data.address1);
  image.print(font16, startX, startY + (ts * 2), data.address2);

  // DNA Box
  startX += 230; // Reset X position
  image.print(font16, startX, startY + (ts * 1), 'DNA:');
  image.print(font16, startX, startY + (ts * 2), dna);

  await image.writeAsync(imgPath);
}

// ----------------------------------------------------------------
// Function to create a directory if it does not exist
async function content(path) {
  return await readFile(path, 'utf8');
}

// ----------------------------------------------------------------
// Helper function to send a path to pinata (ipfs)
async function sendToPinata(context, path, keyvalues) {
  const options = {
    pinataMetadata: { keyvalues },
    pinataOptions: { cidVersion: 1 }
  };

  return context.pinata.pinFromFS(path, options);
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

  if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
    context.pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);
  } else {
    console.log(`Exiting, Missing Pinata API Key and Secret Key, check your .env file.`);
    return;
  }

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
