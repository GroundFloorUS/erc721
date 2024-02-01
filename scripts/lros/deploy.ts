import { ethers } from "hardhat";
import { input } from '@inquirer/prompts';

async function main() {
    const [deployer] = await ethers.getSigners();
    const totalSupply = parseInt(await input({ message: 'How many tokens to be generated?', default: 2 }));

    console.log(`Deploying contracts with the account: ${deployer.address}`);

    // const contract = await ethers.deployContract(
    //     "GroundfloorLroRedemptionToken", 
    //     [deployer.address, 10]);

    const Contract = await ethers.getContractFactory("GroundfloorLroRedemptionToken");
    let contract = await Contract.deploy(deployer.address, totalSupply);
    let contractAddress = await contract.getAddress();

    console.log(`GroundfloorLroRedemptionToken deployed to: ${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
