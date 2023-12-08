import { ethers } from "hardhat";
// import { config as dotenvConfig } from "dotenv";
// dotenvConfig();

async function main() {
    const [deployer] = await ethers.getSigners();
    const totalSupply = 10;
    console.log(`Deploying contracts with the account: ${deployer.address}`);

    // const contract = await ethers.deployContract(
    //     "GroundfloorNoteToken", 
    //     [deployer.address, 10]);

    const Contract = await ethers.getContractFactory("GroundfloorNoteToken");
    let contract = await Contract.deploy(deployer.address, totalSupply);
    let contractAddress = await contract.getAddress();

    console.log(`GroundfloorNoteToken deployed to: ${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
