import { ethers } from "hardhat";
import { GroundfloorNoteToken } from "../typechain/GroundfloorNoteToken";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contracts with the account: ${deployer.address}`);

    const Contract = await ethers.getContractFactory("GroundfloorNoteToken");
    const contract = await Contract.deploy(); // Add constructor arguments if necessary

    console.log(`GroundfloorNoteToken deployed to: ${contract.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
