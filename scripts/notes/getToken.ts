import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

async function main() {
    // Localhost Ids
    // const deployerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    // const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    // Sepolia ids
    const contractAddress = "0x0c3569e963Cbdf810F9481587a709a8A82f8dE0A";

    const [deployer] = await ethers.getSigners();
    const deployerAddress = deployer.address;

    const Contract = await ethers.getContractFactory("GroundfloorNoteToken");
    const contract = await Contract.attach(contractAddress);
    console.log(`Attached to contract at address: ${contractAddress}`);

    await contract.connect(deployerAddress);
    console.log(`Connected to contract from address: ${deployerAddress}`);

    // const mintTx = await contract.symbol();
    //const mintTx = await contract.tokenURI(0);
    //const mintTx = await contract.balanceOf(deployerAddress);
    for (let i=0; i<5; i++) {
        let mintTx = await contract.ownerOf(i);
        let uri = await contract.tokenURI(i);
        console.log(`Token ${i} is Owned By: ${mintTx} => ${uri}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
