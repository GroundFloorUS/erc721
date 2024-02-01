import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { input, select, confirm } from '@inquirer/prompts';
import { hasUncaughtExceptionCaptureCallback } from "process";

dotenvConfig();

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
    let confirmDeployer = await confirm({ message: `Is ${deployerAddress} the correct deployer address? (default: Y)`, default: true});
    if (!confirmDeployer) {
        console.log(`Exiting, deployer address not confirmed. Please check your .env file and make sure we are pulling the correct environment.`);
        return;
    }

    // ----------------------------------------------------------------
    // Script varibles
    let contract = null;
    let contractAddress = null;
    let seriesId = null; // e.g. 000A, used for token dns
    // ----------------------------------------------------------------

    // ----------------------------------------------------------------
    // Confirm we are deploying or attaching to a contract
    let confirmDeploy = await confirm({ message: `Would you like to deploy a new GLRT contract?  (default: n)`, default: false});
    if (confirmDeploy) {
        const supplyToMint = parseInt(await input({ message: 'How many tokens are allowed to be minted with this contract?', default: 40 }));
        console.log(`Deploying contracts with the account: ${deployer.address} with a max supply: ${supplyToMint} tokens.`);

        seriesId = await input({ message: 'What is the series id for this contract? (e.g. A)', default: 'A' });

        contract = await Contract.deploy(deployer.address, seriesId, supplyToMint);
        contractAddress = await contract.getAddress();

        console.log(`GroundfloorLroRedemptionToken deployed to: ${contractAddress}`);
    } else {
        contractAddress = await input({ message: 'What is the address of the contract we should connect to? (e.g hex value)', default: defaultAddress });

        contract = await Contract.attach(contractAddress);
        console.log(`Attached to contract at address: ${contractAddress}`);

        await contract.connect(deployerAddress);
        console.log(`Connected to contract from address: ${deployerAddress}`);

        seriesId = await contract.series();
    }

    // ----------------------------------------------------------------
    // collect the current state of the contract
    const maxSupply = await contract.totalSupply();
    const totalMinted = await contract.totalMinted();
    console.log(`Contract currently has ${totalMinted} of ${maxSupply} tokens minted.`);

    // ----------------------------------------------------------------
    // Confirm minting parameters
    const availableSupply = maxSupply - totalMinted;
    console.log(`Available tokens to mint: ${availableSupply}`);

    const totalToMint = parseInt(await input({ message: 'How many tokens to be generated?', default: availableSupply }));
    if (totalToMint > availableSupply) {
        console.log(`Tokens to be minted exceeds available supply, exiting.`);
        return;
    }

    // ----------------------------------------------------------------
    // Verify the address to mint to
    const ipfsUri = await input({ message: 'For token uri, what is the the ipfs hash for the folder tokens are stored in?', default: 'bafybeib3c4bfv56ivvqubla5zrbmtr64wjr2wfla5f27grvf246k5qfvuq' }); 
    const loanId = await input({ message: 'For token dna, what is the active admin loan id for this contract? (e.g 13994)', default: 13994 }); 
    const maxTokenDigits = parseInt(await input({ message: 'For token dna, what is the number of decimals to have for token ids (e.g. 00000=5)?', default: 5 }));
    const mintToAddress = await input({ message: 'What wallet address should we mint tokens to? (e.g hex value)', default: deployerAddress });
    const maxSeriesDigits = 4;

    // ----------------------------------------------------------------
    // Confirm minting for the correct wallet
    const confirmMint = await confirm({ message: `Mint ${totalToMint} tokens to ${mintToAddress}?  (default: Y)`});
    if (!confirmMint) {
        console.log(`Minting cancelled by user.`);
        return;
    }

    // grab the contract symbol for the token uri
    const symbol = await contract.symbol();
    const seriesKey = seriesId.padStart(maxSeriesDigits, '0');
    console.log(``);
    for (let i=0; i<totalToMint; i++) {
        let tokenId = parseInt(totalMinted) + i;
        let dna = `${symbol}-${seriesKey}-${loanId}-${tokenId.toString().padStart(maxTokenDigits, '0')}`;
        const tokenURI = `${ipfsUri}/${dna}.json`;
        console.log(`----------------------------------------------------`);
        console.log(`  Minting Token: ${i} of ${totalToMint})`);
        console.log(`    Token ID: ${tokenId}`);
        console.log(`    Token URI: ${tokenURI}`);

        const mintTx = await contract.safeMint(mintToAddress, tokenURI);
        console.log(`    Minted token: ${mintTx.hash}\n`);
    }
    console.log(`----------------------------------------------------`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
