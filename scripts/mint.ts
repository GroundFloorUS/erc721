import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

async function main() {
    // Localhost Ids
    // const deployerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    // const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    // Goerli ids
    // const deployerAddress = "0x720D9B8C6f1E3Fc4b956e571D4Db025Db47c979D";
    const contractAddress = "0x2F076E0b1Dc5B6676881029c7e03Fb8591682539";
    
    const [deployer] = await ethers.getSigners();
    const deployerAddress = deployer.address;
    const tokenURI = 'https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/QmXKrS8rcUFHDsRFsaDfv25wpMYnZfZMA19jdtPeAoDWok/A5000.json';

    const Contract = await ethers.getContractFactory("GroundfloorNoteToken");
    const contract = await Contract.attach(contractAddress);
    console.log(`Attached to contract at address: ${contractAddress}`);

    await contract.connect(deployerAddress);
    console.log(`Connected to contract from address: ${deployerAddress}`);
    console.log(`Minting:`);
    console.log(`   Token To: ${deployerAddress}`);
    console.log(`   Token URI: ${tokenURI}`);

    const mintTx = await contract.safeMint(deployerAddress, tokenURI);
    console.log(`Minted token: ${mintTx.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
