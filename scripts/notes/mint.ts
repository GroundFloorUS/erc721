import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

async function main() {
    // Localhost Ids
    // const deployerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    // const contractAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";

    // Sepolia ids
    const contractAddress = "0x0c3569e963Cbdf810F9481587a709a8A82f8dE0A";
    const [deployer] = await ethers.getSigners();
    const deployerAddress = deployer.address;

    const tokenURIs = [
        'https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/bafybeiebpy5yc36njffdzljijwg6vn3wc7egxjsr6yknxuiht2iibpsf6i/GFNT-A5000-metadata.json',
        'https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/bafybeiebpy5yc36njffdzljijwg6vn3wc7egxjsr6yknxuiht2iibpsf6i/GFNT-A5001-metadata.json',
        'https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/bafybeiebpy5yc36njffdzljijwg6vn3wc7egxjsr6yknxuiht2iibpsf6i/GFNT-A5002-metadata.json',
        'https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/bafybeiebpy5yc36njffdzljijwg6vn3wc7egxjsr6yknxuiht2iibpsf6i/GFNT-A5003-metadata.json',
        'https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/bafybeiebpy5yc36njffdzljijwg6vn3wc7egxjsr6yknxuiht2iibpsf6i/GFNT-A5004-metadata.json'
    ];

    const Contract = await ethers.getContractFactory("GroundfloorNoteToken");
    const contract = await Contract.attach(contractAddress);
    console.log(`Attached to contract at address: ${contractAddress}`);

    await contract.connect(deployerAddress);
    console.log(`Connected to contract from address: ${deployerAddress}`);
    console.log(`Minting To Address: ${deployerAddress}`);

    for (let i=0; i<tokenURIs.length; i++) {
        console.log(`----------------------------------------------------`);
        console.log(`  Minting Token: ${i} of ${tokenURIs.length}`);
        const tokenURI = tokenURIs[i];
        console.log(`    Token URI: ${tokenURI}`);
        const mintTx = await contract.safeMint(deployerAddress, tokenURI);
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
