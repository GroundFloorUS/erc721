import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { input, select, confirm } from '@inquirer/prompts';
import { exit } from "process";

dotenvConfig();

// ----------------------------------------------------------------
// Command functions to be run
async function askForCommand(contract) {
    const cmd = await select({
        message: 'What environment you are minting against?',
        choices: [
          {
            name: 'List Minted Tokens',
            value: 'list',
            description: 'List all of the minted tokens and who their owners are',
          },
          {
            name: 'Show Wallet Balance',
            value: 'balance',
            description: 'Show balance of a given wallet',
          },
          {
            name: 'Exit',
            value: 'exit'
          },
        ],
      });

    console.log(``);
    console.log(`----------------------------------------------------`);
    switch(cmd) { 
        case 'list': { 
            await showTokens(contract);
            break; 
        }
        case 'balance': { 
            await showBalance(contract);
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
    console.log(``);
    return true;
}

async function showTokens(contract) {
    const totalMinted = await contract.totalMinted();

    for (let i=0; i<totalMinted; i++) {
        let mintTx = await contract.ownerOf(i);
        let uri = await contract.tokenURI(i);
        console.log(`Token ${i}:`);
        console.log(`  Owned By: ${mintTx}`);
        console.log(`  Metadata Uri: ${uri}`);
        console.log(`----------------------------------------------------`);
    }
}

async function showBalance(contract) {
    const walletAddress = await input({ message: 'What wallet address should we mint tokens to? (e.g hex value)' });

    const balance = await contract.balanceOf(walletAddress);
    console.log(`Wallet (${walletAddress} has a balance of: ${balance}`);
    console.log(`----------------------------------------------------`);
}


// ----------------------------------------------------------------
// Main Script Function
async function main() {
    // ----------------------------------------------------------------
    // Script constants
    const Contract = await ethers.getContractFactory("GroundfloorLroRedemptionToken");
    const [deployer] = await ethers.getSigners();
    const deployerAddress = deployer.address;
    const defaultUriBase = 'https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/bafybeifcfnt5qsdw3hezgie3dovf6wkcs73reuwqvvjffocfvvb2igcdwy';
    // ----------------------------------------------------------------

    // ----------------------------------------------------------------
    // Source and load env defaults
    const env = await select({
        message: 'What environment you are minting against?',
        choices: [
          {
            name: 'localhost',
            value: 'localhost',
            description: 'Local hardhat network, make sure npx hardhat node is running',
          },
          {
            name: 'Sepolia',
            value: 'sepolia',
            description: 'You are minting to the test network Sepolia',
          },
        ],
      });

    let defaultAddress = null;
    switch(env) { 
        case 'localhost': { 
            defaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            break; 
        } 
        case 'sepolia': { 
            defaultAddress = "0x0c3569e963Cbdf810F9481587a709a8A82f8dE0A";
            break; 
        } 
        default: { 
            console.log(`Exiting, Invalid environment: ${env}`);
            return;
        } 
    }  

    console.log("Loaded envinronment defautls for: %s", env);

    // ----------------------------------------------------------------
    // Confirm deployer address
    const connectionAddress = await input({ message: `What is the correct wallet to connect with?`, default: deployerAddress});

    // ----------------------------------------------------------------
    // Script varibles
    let contract = null;
    let contractAddress = null;
    // ----------------------------------------------------------------

    // ----------------------------------------------------------------
    // Confirm we are deploying or attaching to a contract
    contractAddress = await input({ message: 'What is the address of the contract we should connect to? (e.g hex value)', default: defaultAddress });

    contract = await Contract.attach(contractAddress);
    console.log(`Attached to contract at address: ${contractAddress}`);

    await contract.connect(connectionAddress);
    console.log(`Connected to contract from address: ${connectionAddress}`);

    // ----------------------------------------------------------------
    // Command loops
    let interact = true
    while (interact) {
        interact = await askForCommand(contract);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
